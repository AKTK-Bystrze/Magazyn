import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useReservationCart } from "@/hooks/useReservationCart";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import { validateCart } from "@/lib/utils/cart-validation";
import { CartItemList } from "./CartItemList";
import { DateRangePicker } from "./DateRangePicker";
import { CostEstimator } from "./CostEstimator";
import { ConfirmationModal } from "./ConfirmationModal";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import type { CreateReservationsCommand, UserListItem } from "@/types";
import type { AvailabilityCheckResult } from "@/types/reservation-cart.types";
import { transformCreateReservationsCommand } from "@/lib/transformers/reservation.transformer";
import { CLEAR_CART_CONFIRM_TIMEOUT_MS } from "@/lib/config/constants";
import { ROUTES } from "@/lib/config/routes";
import { UserSelector } from "@/components/admin/UserSelector";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { calculateCost as calculateCartCost } from "@/lib/utils/cart-validation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Props for ReservationCartView component
 */
interface ReservationCartViewProps {
  /** User's current credit balance for cost calculations and validation */
  initialCreditBalance: number;
  /** Enable admin mode to create reservations on behalf of other users */
  isAdmin?: boolean;
  /** Route to redirect after successful reservation */
  successRedirectPath?: string;
  /** Pre-selected user ID (admin mode) - defaults to admin's own ID */
  initialSelectedUserId?: string;
  /** Pre-selected user's credit balance (admin mode) */
  initialSelectedUserCreditBalance?: number;
  /** Path to equipment browse page for empty cart. Defaults to public equipment. */
  equipmentBrowsePath?: string;
}

/**
 * Main checkout view for completing equipment reservations.
 * Displays cart items, date selection, cost estimation, and confirmation flow.
 * In admin mode, allows creating reservations for other users.
 *
 * @param props - Component props
 * @returns Reservation checkout interface
 *
 * @example
 * ```tsx
 * // User checkout
 * <ReservationCartView initialCreditBalance={100} />
 *
 * // Admin checkout
 * <ReservationCartView initialCreditBalance={0} isAdmin />
 * ```
 */
export function ReservationCartView({
  initialCreditBalance,
  isAdmin = false,
  successRedirectPath = ROUTES.PROTECTED.RESERVATIONS,
  initialSelectedUserId,
  initialSelectedUserCreditBalance = 0,
  equipmentBrowsePath = ROUTES.PUBLIC.EQUIPMENT,
}: ReservationCartViewProps) {
  const {
    cartState,
    removeItem,
    updateStartDate,
    updateEndDate,
    clearCart,
  } = useReservationCart(initialCreditBalance);

  const { checkAvailability, isChecking } = useAvailabilityCheck(
    cartState.items,
    cartState.startDate,
    cartState.endDate
  );

  const [isConfirmationOpen, setIsConfirmationOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availabilityResult, setAvailabilityResult] = React.useState<AvailabilityCheckResult>({ 
    isAllAvailable: true, 
    unavailableItems: [] 
  });
  
  const [submissionError, setSubmissionError] = React.useState<string | null>(null);
  const [clearCartPending, setClearCartPending] = React.useState(false);

  // Admin-only: selected user for creating reservations on their behalf
  // Initialize with admin's own ID if provided
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(
    initialSelectedUserId ?? null
  );
  const [selectedUserCreditBalance, setSelectedUserCreditBalance] = React.useState<number>(
    initialSelectedUserCreditBalance
  );
  const [isFreeReservation, setIsFreeReservation] = React.useState(false);

  /**
   * Handler for admin user selection.
   * Updates both the user ID and their credit balance.
   */
  const handleUserSelect = React.useCallback((user: UserListItem) => {
    setSelectedUserId(user.id);
    setSelectedUserCreditBalance(user.creditBalance);
  }, []);

  // Use selected user's credit balance in admin mode, otherwise use initial (logged-in user's)
  // For free reservations, use a very high balance to skip validation
  const effectiveCreditBalance = isAdmin && isFreeReservation 
    ? 0 : (isAdmin ? selectedUserCreditBalance : initialCreditBalance);

  // Calculate cost breakdown with the effective credit balance
  // This ensures admin mode uses selected user's balance, not the admin's
  const costBreakdown = React.useMemo(() => {
    if (!cartState.startDate || !cartState.endDate || cartState.items.length === 0) {
      return null;
    }
    const breakdown = calculateCartCost(
      cartState.items,
      cartState.startDate,
      cartState.endDate,
      effectiveCreditBalance
    );
    
    // For free reservations, override costs to 0
    if (isAdmin && isFreeReservation && breakdown) {
      return {
        ...breakdown,
        itemCosts: breakdown.itemCosts.map(item => ({ ...item, totalCost: 0 })),
        totalCreditCost: 0,
        remainingBalance: breakdown.currentBalance, // No deduction for free
        isFreeReservation: true,
      };
    }
    
    return breakdown;
  }, [cartState.items, cartState.startDate, cartState.endDate, effectiveCreditBalance, isAdmin, isFreeReservation]);
  
  // Create a default safe breakdown if null (e.g. missing dates)
  const safeCostBreakdown = costBreakdown || {
    itemCosts: [],
    totalCreditCost: 0,
    currentBalance: effectiveCreditBalance,
    remainingBalance: effectiveCreditBalance,
  };

  const validation = validateCart(
    cartState,
    availabilityResult,
    safeCostBreakdown,
    isAdmin && isFreeReservation
  );

  // Check availability when user tries to proceed
  const handleProceed = async () => {
    // 1. Admin mode requires a selected user
    if (isAdmin && !selectedUserId) {
      setSubmissionError("Please select a user to create the reservation for.");
      return;
    }

    // 2. Basic validation
    if (!cartState.startDate || !cartState.endDate || cartState.items.length === 0) {
      return;
    }

    // 3. Clear previous errors
    setSubmissionError(null);

    // 4. Check real-time availability
    const result = await checkAvailability();
    setAvailabilityResult(result);

    if (result.isAllAvailable) {
      setIsConfirmationOpen(true);
    }
  };

  const handleConfirmReservation = async () => {
    if (!cartState.startDate || !cartState.endDate) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const command: CreateReservationsCommand = {
        reservations: cartState.items.map((item) => ({
          equipmentId: item.equipmentId,
          startDate: cartState.startDate!,
          endDate: cartState.endDate!,
        })),
        // Admin mode: include selected user ID
        ...(isAdmin && selectedUserId && { userId: selectedUserId }),
        // Admin mode: include free reservation flag if set
        ...(isAdmin && isFreeReservation && { freeReservation: true }),
      };

      // Transform to backend format (snake_case)
      const backendCommand = transformCreateReservationsCommand(command);

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers,
        body: JSON.stringify(backendCommand),
      });

      if (!response.ok) {
        const errorData = await response.json();
        let errorMessage = errorData.message || errorData.error || "Failed to create reservation";

        // Replace equipment IDs with names for better UX
        cartState.items.forEach((item) => {
          if (errorMessage.includes(item.equipmentId)) {
            errorMessage = errorMessage.replace(item.equipmentId, `"${item.name}"`);
          }
        });

        // Make conflict errors more user-friendly
        if (errorMessage.includes("Conflict detected")) {
          errorMessage = errorMessage.replace("Conflict detected for equipment", "This equipment is already reserved:");
        }

        throw new Error(errorMessage);
      }

      // Success!
      await response.json();
      
      // Clear cart
      clearCart();
      setIsFreeReservation(false);
      setIsConfirmationOpen(false);
      
      // Redirect to reservations page with success indicator
      window.location.href = `${successRedirectPath}?success=true`;
    } catch (error) {
      console.error("Reservation failed:", error);
      setSubmissionError(error instanceof Error ? error.message : "An unexpected error occurred");
      setIsConfirmationOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCart = () => {
    if (!clearCartPending) {
      // First click - show warning
      setClearCartPending(true);
      setTimeout(() => setClearCartPending(false), CLEAR_CART_CONFIRM_TIMEOUT_MS);
    } else {
    // Second click - actually clear
      clearCart();
      setClearCartPending(false);
    }
  };

  // If cart is empty (initial state)
  const isEmpty = cartState.items.length === 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl" data-testid="reservation-cart">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Complete Reservation</h1>
        {!isEmpty && (
          <Button
            variant={clearCartPending ? "destructive" : "outline"}
            onClick={handleClearCart}
            size="sm"
            className="transition-all duration-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {clearCartPending ? "Click again to confirm" : "Clear Cart"}
          </Button>
        )}
      </div>

      {/* Admin User Selector */}
      {isAdmin && !isEmpty && (
        <section className="bg-card rounded-lg border shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Create Reservation For</h2>
          <QueryProvider>
            <UserSelector
              selectedUserId={selectedUserId}
              onSelect={handleUserSelect}
              label="Select the user for this reservation"
            />
          </QueryProvider>
          {!selectedUserId && (
            <p className="text-sm text-muted-foreground mt-2">
              You must select a user before completing the reservation.
            </p>
          )}
          
          <div className="mt-6 flex items-center space-x-2 border-t pt-4">
            <Checkbox
              id="free-reservation"
              checked={isFreeReservation}
              onCheckedChange={(checked) => setIsFreeReservation(checked === true)}
              data-testid="free-reservation-checkbox"
            />
            <Label 
              htmlFor="free-reservation" 
              className="cursor-pointer font-medium"
            >
              Create as Free Reservation
            </Label>
          </div>
          {isFreeReservation && (
            <p className="text-sm text-muted-foreground mt-2">
              This reservation will not charge the user any credits.
            </p>
          )}
        </section>
      )}

      {submissionError && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle className="h-4 w-4" />
          <h5 className="mb-1 font-medium leading-none tracking-tight">Reservation Failed</h5>
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      {/* Availability Errors Display */}
      {!availabilityResult.isAllAvailable && availabilityResult.unavailableItems.length > 0 && (
         <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive" data-testid="error-reservation-conflict">
           <AlertCircle className="h-4 w-4" />
           <h5 className="mb-1 font-medium leading-none tracking-tight">Availability Issues Detected</h5>
           <AlertDescription>
            <ul className="list-disc pl-5 mt-2 space-y-2">
               {availabilityResult.unavailableItems.map(item => (
                 <li key={item.equipmentId}>
                   <strong>{item.name}</strong>: {item.reason}
                   {item.conflictingReservations && item.conflictingReservations.length > 0 && (
                     <div className="mt-1 text-sm">
                       <span className="font-medium">Conflicting reservations:</span>
                       <ul className="list-none pl-4 mt-1 space-y-1">
                         {item.conflictingReservations.map((conflict, idx) => (
                           <li key={idx} className="text-xs">
                             • {conflict.startDate} to {conflict.endDate}
                           </li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </li>
               ))}
             </ul>
             <p className="mt-2 text-sm">Please remove these items or change your dates.</p>
           </AlertDescription>
         </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Cart Items & Dates (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-card rounded-lg border shadow-sm p-6">
            <CartItemList 
              items={cartState.items} 
              onRemoveItem={removeItem}
              equipmentBrowsePath={equipmentBrowsePath}
            />
          </section>

          {!isEmpty && (
            <section className="bg-card rounded-lg border shadow-sm p-6">
              <DateRangePicker 
                startDate={cartState.startDate}
                endDate={cartState.endDate}
                onStartDateChange={updateStartDate}
                onEndDateChange={updateEndDate}
                validationErrors={validation.errors.dateRange}
              />
            </section>
          )}
        </div>

        {/* Right Column: Cost & Actions (1/3 width) */}
        {!isEmpty && (
          <div className="space-y-6">
            <CostEstimator 
              items={cartState.items}
              startDate={cartState.startDate}
              endDate={cartState.endDate}
              currentCreditBalance={effectiveCreditBalance}
            />

            <Button 
              size="lg" 
              className="w-full text-lg font-semibold relative z-20" 
              onClick={handleProceed}
              disabled={!validation.isValid || isChecking || (isAdmin && !selectedUserId)}
              data-testid="checkout-button"
            >
              {isChecking ? (
                <>Checking Availability...</>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Review & Confirm
                </>
              )}
            </Button>
            
            {validation.errors.creditBalance && (
               <p className="text-sm text-destructive text-center font-medium">
                 {validation.errors.creditBalance}
               </p>
            )}
            
            <p className="text-xs text-muted-foreground text-center">
              You will modify your reservation one last time before confirming.
            </p>
          </div>
        )}
      </div>

      {isConfirmationOpen && safeCostBreakdown && cartState.startDate && cartState.endDate && (
        <ConfirmationModal
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
          onConfirm={handleConfirmReservation}
          items={cartState.items}
          startDate={cartState.startDate}
          endDate={cartState.endDate}
          costBreakdown={safeCostBreakdown}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
