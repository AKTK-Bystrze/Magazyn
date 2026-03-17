import type {
  CartState,
  DateRangeValidationErrors,
  CostBreakdown,
  CartValidation,
  AvailabilityCheckResult,
  CartItem,
} from "@/types/reservation-cart.types";
import { getTodayAtMidnight, calculateDays } from "@/lib/utils/date-utils";
import {
  ERROR_START_DATE_PAST,
  ERROR_END_DATE_BEFORE_START,
  ERROR_ITEMS_UNAVAILABLE,
  ERROR_INSUFFICIENT_CREDITS,
} from "@/lib/config/constants";

/**
 * Validates the date range for the reservation cart
 *
 * @param startDate - The start date in YYYY-MM-DD format
 * @param endDate - The end date in YYYY-MM-DD format
 * @returns Validation errors for start and end dates
 */
export function validateDateRange(
  startDate: string | null,
  endDate: string | null
): DateRangeValidationErrors {
  const errors: DateRangeValidationErrors = {
    startDate: null,
    endDate: null,
  };

  if (startDate) {
    const start = new Date(startDate);
    const today = getTodayAtMidnight();

    if (start <= today) {
      errors.startDate = ERROR_START_DATE_PAST;
    }
  }

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      errors.endDate = ERROR_END_DATE_BEFORE_START;
    }
  }

  return errors;
}

// Re-export calculateDays from date-utils for consistency
export { calculateDays } from "@/lib/utils/date-utils";

/**
 * Calculates the total cost for all items in the cart
 *
 * @param items - Array of cart items
 * @param startDate - The start date in YYYY-MM-DD format
 * @param endDate - The end date in YYYY-MM-DD format
 * @param currentBalance - User's current credit balance
 * @returns Cost breakdown with item costs and remaining balance
 */
export function calculateCost(
  items: CartItem[],
  startDate: string,
  endDate: string,
  currentBalance: number
): CostBreakdown {
  const days = calculateDays(startDate, endDate);

  const itemCosts = items.map((item) => ({
    equipmentId: item.equipmentId,
    name: item.name,
    days,
    creditCostPerDay: item.creditCostPerDay,
    totalCost: item.creditCostPerDay * days,
  }));

  const totalCreditCost = itemCosts.reduce(
    (sum, item) => sum + item.totalCost,
    0
  );
  const remainingBalance = currentBalance - totalCreditCost;

  return {
    itemCosts,
    totalCreditCost,
    currentBalance,
    remainingBalance,
  };
}

/**
 * Validates the entire cart state
 *
 * @param cartState - The current cart state
 * @param availabilityResult - Result of availability check for all items
 * @param costBreakdown - Cost breakdown for the cart
 * @param isFreeReservation - Whether this is a free reservation (skips credit check)
 * @returns Overall cart validation state
 */
export function validateCart(
  cartState: CartState,
  availabilityResult: AvailabilityCheckResult,
  costBreakdown: CostBreakdown,
  isFreeReservation?: boolean
): CartValidation {
  const dateRangeErrors = validateDateRange(
    cartState.startDate,
    cartState.endDate
  );

  const hasSufficientCredits = isFreeReservation || costBreakdown.remainingBalance >= 0;

  return {
    isValid:
      cartState.items.length > 0 &&
      cartState.startDate !== null &&
      cartState.endDate !== null &&
      dateRangeErrors.startDate === null &&
      dateRangeErrors.endDate === null &&
      availabilityResult.isAllAvailable &&
      hasSufficientCredits,
    errors: {
      dateRange: dateRangeErrors,
      availability: availabilityResult.isAllAvailable
        ? null
        : ERROR_ITEMS_UNAVAILABLE(availabilityResult.unavailableItems.length),
      creditBalance:
        isFreeReservation || costBreakdown.remainingBalance >= 0
          ? null
          : ERROR_INSUFFICIENT_CREDITS(Math.abs(costBreakdown.remainingBalance)),
      general: null,
    },
  };
}
