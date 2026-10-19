import type {
  CartState,
  DateRangeValidationErrors,
  CostBreakdown,
  CartValidation,
  AvailabilityCheckResult,
  CartItem,
} from "@/types/reservation-cart.types";
import { getTodayAsString, calculateDays } from "@/lib/utils/date-utils";
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
 * @param allowPastDates - Whether to allow past dates (e.g. for admin overrides)
 * @returns Validation errors for start and end dates
 */
export function validateDateRange(
  startDate: string | null,
  endDate: string | null,
  allowPastDates = false
): DateRangeValidationErrors {
  const errors: DateRangeValidationErrors = {
    startDate: null,
    endDate: null,
  };

  const startStr = startDate?.split("T")[0];
  const endStr = endDate?.split("T")[0];

  if (startStr && !allowPastDates && startStr < getTodayAsString()) {
    errors.startDate = ERROR_START_DATE_PAST;
  }

  if (startStr && endStr && endStr < startStr) {
    errors.endDate = ERROR_END_DATE_BEFORE_START;
  }

  return errors;
}

/**
 * Calculates the total cost for all items in the cart
 *
 * @param items - Array of cart items
 * @param startDate - The start date in YYYY-MM-DD format
 * @param endDate - The end date in YYYY-MM-DD format
 * @param currentBalance - User's current credit balance
 * @param isFreeReservation - Whether this is a free reservation (zero cost override)
 * @returns Cost breakdown with item costs and remaining balance
 */
export function calculateCost(
  items: CartItem[],
  startDate: string,
  endDate: string,
  currentBalance: number,
  isFreeReservation = false
): CostBreakdown {
  const days = Math.max(0, calculateDays(startDate, endDate));

  const itemCosts = items.map((item) => ({
    equipmentId: item.equipmentId,
    name: item.name,
    days,
    creditCostPerDay: item.creditCostPerDay,
    totalCost: isFreeReservation ? 0 : item.creditCostPerDay * days,
  }));

  const totalCreditCost = itemCosts.reduce((sum, item) => sum + item.totalCost, 0);
  const remainingBalance = currentBalance - totalCreditCost;

  return {
    itemCosts,
    totalCreditCost,
    currentBalance,
    remainingBalance,
    ...(isFreeReservation ? { isFreeReservation: true } : {}),
  };
}

/**
 * Validates the entire cart state
 *
 * @param cartState - The current cart state
 * @param availabilityResult - Result of availability check for all items
 * @param costBreakdown - Cost breakdown for the cart
 * @param isFreeReservation - Whether this is a free reservation (skips credit check)
 * @param allowPastDates - Whether to allow past dates (e.g. for admin overrides)
 * @returns Overall cart validation state
 */
export function validateCart(
  cartState: CartState,
  availabilityResult: AvailabilityCheckResult,
  costBreakdown: CostBreakdown,
  isFreeReservation?: boolean,
  allowPastDates = false
): CartValidation {
  const dateRangeErrors = validateDateRange(cartState.startDate, cartState.endDate, allowPastDates);

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
