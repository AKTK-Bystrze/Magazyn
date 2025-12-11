import * as React from "react";
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
import type { CreateReservationsCommand } from "@/types";
import type { AvailabilityCheckResult } from "@/types/reservation-cart.types";

interface ReservationCartViewProps {
  initialCreditBalance: number;
}

export function ReservationCartView({
  initialCreditBalance,
}: ReservationCartViewProps) {
  const {
    cartState,
    addItem, 
    removeItem,
    updateStartDate,
    updateEndDate,
    clearCart,
    calculateCost,
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

  // Derived state for validation
  const costBreakdown = calculateCost();
  
  // Create a default safe breakdown if null (e.g. missing dates)
  const safeCostBreakdown = costBreakdown || {
    itemCosts: [],
    totalCreditCost: 0,
    currentBalance: initialCreditBalance,
    remainingBalance: initialCreditBalance,
  };

  const validation = validateCart(
    cartState,
    availabilityResult, 
    safeCostBreakdown
  );

  // Check availability when user tries to proceed
  const handleProceed = async () => {
    // 1. Basic validation first
    if (!cartState.startDate || !cartState.endDate || cartState.items.length === 0) {
      return;
    }

    // 2. clear previous errors
    setSubmissionError(null);

    // 3. Check real-time availability
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
      const command: CreateReservationsCommand = {
        reservations: cartState.items.map((item) => ({
          equipmentId: item.equipmentId,
          startDate: cartState.startDate!,
          endDate: cartState.endDate!,
        })),
      };

      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create reservation");
      }

      // Success!
      await response.json();
      
      // Clear cart
      clearCart();
      setIsConfirmationOpen(false);
      
      // Redirect to reservations page
      window.location.href = "/reservations?success=true";
    } catch (error) {
      console.error("Reservation failed:", error);
      setSubmissionError(error instanceof Error ? error.message : "An unexpected error occurred");
      setIsConfirmationOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClearCart = () => {
    if (confirm("Are you sure you want to clear the cart?")) {
      clearCart();
    }
  };

  // If cart is empty (initial state)
  const isEmpty = cartState.items.length === 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Complete Reservation</h1>
        {!isEmpty && (
          <Button variant="outline" onClick={handleClearCart} size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Cart
          </Button>
        )}
      </div>

      {submissionError && (
        <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
          <AlertCircle className="h-4 w-4" />
          <h5 className="mb-1 font-medium leading-none tracking-tight">Reservation Failed</h5>
          <AlertDescription>{submissionError}</AlertDescription>
        </Alert>
      )}

      {/* Availability Errors Display */}
      {!availabilityResult.isAllAvailable && availabilityResult.unavailableItems.length > 0 && (
         <Alert className="border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive">
           <AlertCircle className="h-4 w-4" />
           <h5 className="mb-1 font-medium leading-none tracking-tight">Availability Issues Detected</h5>
           <AlertDescription>
             <ul className="list-disc pl-5 mt-2 space-y-1">
               {availabilityResult.unavailableItems.map(item => (
                 <li key={item.equipmentId}>
                   <strong>{item.name}</strong>: {item.reason}
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
              currentCreditBalance={initialCreditBalance}
            />

            <Button 
              size="lg" 
              className="w-full text-lg font-semibold" 
              onClick={handleProceed}
              disabled={!validation.isValid || isChecking}
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
