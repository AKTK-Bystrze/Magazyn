import * as React from "react";
import { useReservationCart } from "@/hooks/useReservationCart";
import { useAvailabilityCheck } from "@/hooks/useAvailabilityCheck";
import { useCartCheckout } from "@/hooks/useCartCheckout";
import { validateCart, calculateCost as calculateCartCost } from "@/lib/utils/cart-validation";
import { CartItemList } from "./CartItemList";
import { DateRangePicker } from "./DateRangePicker";
import { CostEstimator } from "./CostEstimator";
import { ConfirmationModal } from "./ConfirmationModal";
import { AdminReservationDelegateSection } from "./AdminReservationDelegateSection";
import { CartAvailabilityAlerts } from "./CartAvailabilityAlerts";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle2 } from "lucide-react";
import type { UserListItem } from "@/types";
import type { AvailabilityCheckResult } from "@/types/reservation-cart.types";
import { CLEAR_CART_CONFIRM_TIMEOUT_MS } from "@/lib/config/constants";
import { ROUTES } from "@/lib/config/routes";

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
 */
export function ReservationCartView({
  initialCreditBalance,
  isAdmin = false,
  successRedirectPath = ROUTES.PROTECTED.RESERVATIONS,
  initialSelectedUserId,
  initialSelectedUserCreditBalance = 0,
  equipmentBrowsePath = ROUTES.PUBLIC.EQUIPMENT,
}: ReservationCartViewProps) {
  const { cartState, removeItem, updateStartDate, updateEndDate, clearCart } =
    useReservationCart(initialCreditBalance);

  const { checkAvailability, isChecking } = useAvailabilityCheck(
    cartState.items,
    cartState.startDate,
    cartState.endDate
  );

  const [isConfirmationOpen, setIsConfirmationOpen] = React.useState(false);
  const [availabilityResult, setAvailabilityResult] = React.useState<AvailabilityCheckResult>({
    isAllAvailable: true,
    unavailableItems: [],
  });

  const [clearCartPending, setClearCartPending] = React.useState(false);

  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(
    initialSelectedUserId ?? null
  );
  const [selectedUserCreditBalance, setSelectedUserCreditBalance] = React.useState<number>(
    initialSelectedUserCreditBalance
  );
  const [isFreeReservation, setIsFreeReservation] = React.useState(false);

  const { isSubmitting, submissionError, setSubmissionError, submitReservation } = useCartCheckout({
    cartState,
    clearCart,
    isAdmin,
    selectedUserId,
    isFreeReservation,
    setIsFreeReservation,
    successRedirectPath,
    onSuccess: () => setIsConfirmationOpen(false),
  });

  React.useEffect(() => {
    setAvailabilityResult({ isAllAvailable: true, unavailableItems: [] });
    setSubmissionError(null);
  }, [cartState.startDate, cartState.endDate, cartState.items, setSubmissionError]);

  const handleUserSelect = React.useCallback((user: UserListItem) => {
    setSelectedUserId(user.id);
    setSelectedUserCreditBalance(user.creditBalance);
  }, []);

  const effectiveCreditBalance = isAdmin ? selectedUserCreditBalance : initialCreditBalance;

  const costBreakdown = React.useMemo(() => {
    if (!cartState.startDate || !cartState.endDate || cartState.items.length === 0) {
      return null;
    }
    return calculateCartCost(
      cartState.items,
      cartState.startDate,
      cartState.endDate,
      effectiveCreditBalance,
      Boolean(isAdmin && isFreeReservation)
    );
  }, [
    cartState.items,
    cartState.startDate,
    cartState.endDate,
    effectiveCreditBalance,
    isAdmin,
    isFreeReservation,
  ]);

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

  const handleProceed = async () => {
    if (isAdmin && !selectedUserId) {
      setSubmissionError("Please select a user to create the reservation for.");
      return;
    }

    if (!cartState.startDate || !cartState.endDate || cartState.items.length === 0) {
      return;
    }

    setSubmissionError(null);

    const result = await checkAvailability();
    setAvailabilityResult(result);

    if (result.isAllAvailable) {
      setIsConfirmationOpen(true);
    }
  };

  const handleConfirmReservation = async () => {
    const success = await submitReservation();
    if (!success) {
      setIsConfirmationOpen(false);
    }
  };

  const handleClearCart = () => {
    if (!clearCartPending) {
      setClearCartPending(true);
      setTimeout(() => setClearCartPending(false), CLEAR_CART_CONFIRM_TIMEOUT_MS);
    } else {
      clearCart();
      setClearCartPending(false);
    }
  };

  const isEmpty = cartState.items.length === 0;

  return (
    <div className="container mx-auto py-8 px-4 space-y-8 max-w-7xl" data-testid="reservation-cart">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dokończ Rezerwację</h1>
        {!isEmpty && (
          <Button
            variant={clearCartPending ? "destructive" : "outline"}
            onClick={handleClearCart}
            size="sm"
            className="transition-all duration-300"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {clearCartPending ? "Kliknij ponownie aby potwierdzić" : "Wyczyść Koszyk"}
          </Button>
        )}
      </div>

      {isAdmin && !isEmpty && (
        <AdminReservationDelegateSection
          selectedUserId={selectedUserId}
          onSelectUser={handleUserSelect}
          isFreeReservation={isFreeReservation}
          onToggleFreeReservation={setIsFreeReservation}
        />
      )}

      <CartAvailabilityAlerts
        submissionError={submissionError}
        availabilityResult={availabilityResult}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
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

          <section className="bg-card rounded-lg border shadow-sm p-6">
            <CartItemList
              items={cartState.items}
              onRemoveItem={removeItem}
              equipmentBrowsePath={equipmentBrowsePath}
            />
          </section>
        </div>

        {!isEmpty && (
          <div className="space-y-6">
            <CostEstimator
              items={cartState.items}
              startDate={cartState.startDate}
              endDate={cartState.endDate}
              currentCreditBalance={effectiveCreditBalance}
              isFreeReservation={isAdmin && isFreeReservation}
            />

            <Button
              size="lg"
              className="w-full text-lg font-semibold relative z-20"
              onClick={handleProceed}
              disabled={!validation.isValid || isChecking || (isAdmin && !selectedUserId)}
              data-testid="checkout-button"
            >
              {isChecking ? (
                <>Sprawdzanie Dostępności...</>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-5 w-5" />
                  Przejrzyj i Potwierdź
                </>
              )}
            </Button>

            {validation.errors.creditBalance && (
              <p className="text-sm text-destructive text-center font-medium">
                {validation.errors.creditBalance}
              </p>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Zostaniesz poproszony o ostateczne potwierdzenie rezerwacji.
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
