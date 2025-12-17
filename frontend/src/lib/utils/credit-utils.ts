import type { CreditAdjustmentInfo } from "@/types/reservations/reservation.types";

/**
 * Calculates whether a date extension is considered "significant"
 * A significant extension meets either of these criteria:
 * - Duration increase > 50%
 * - Additional days > 3
 *
 * @param originalDays - Original reservation duration in days
 * @param newDays - New reservation duration in days
 * @returns True if extension is significant
 */
export function isSignificantExtension(originalDays: number, newDays: number): boolean {
  // If reservation is being shortened, it's not an extension
  if (newDays <= originalDays) {
    return false;
  }

  const dayIncrease = newDays - originalDays;
  const percentIncrease = (dayIncrease / originalDays) * 100;

  // Significant if more than 3 days added OR more than 50% increase
  return dayIncrease > 3 || percentIncrease > 50;
}

/**
 * Calculates credit adjustment information for date modifications
 * Positive adjustment = refund (credits returned to user)
 * Negative adjustment = charge (credits deducted from user)
 *
 * @param originalDays - Original reservation duration in days
 * @param newDays - New reservation duration in days
 * @param creditPerDay - Credit cost per day for this equipment
 * @param currentBalance - User's current credit balance
 * @returns Complete adjustment information including costs and new balance
 */
export function calculateCreditAdjustment(
  originalDays: number,
  newDays: number,
  creditPerDay: number,
  currentBalance: number
): CreditAdjustmentInfo {
  const originalCost = originalDays * creditPerDay;
  const newCost = newDays * creditPerDay;
  const adjustment = originalCost - newCost; // positive = refund, negative = charge

  return {
    originalDays,
    newDays,
    originalCost,
    newCost,
    adjustment,
    newBalance: currentBalance + adjustment,
    isSignificantExtension: isSignificantExtension(originalDays, newDays),
  };
}

/**
 * Formats credit adjustment for display
 * Shows refund as positive (green) and charge as negative (red)
 *
 * @param adjustment - Credit adjustment amount (positive = refund, negative = charge)
 * @returns Formatted string with symbol
 */
export function formatCreditAdjustment(adjustment: number): string {
  if (adjustment > 0) {
    return `+${adjustment} credits (refund)`;
  } else if (adjustment < 0) {
    return `${adjustment} credits (charge)`;
  }
  return "No change";
}

/**
 * Determines if user has sufficient credits for an adjustment
 * Used to validate date extensions that require additional credits
 *
 * @param adjustment - Credit adjustment amount (negative = charge)
 * @param currentBalance - User's current credit balance
 * @returns True if user has sufficient credits
 */
export function hasSufficientCredits(adjustment: number, currentBalance: number): boolean {
  // If adjustment is positive (refund) or zero, always sufficient
  if (adjustment >= 0) {
    return true;
  }

  // For negative adjustments (charges), check if new balance would be non-negative
  const newBalance = currentBalance + adjustment;
  return newBalance >= 0;
}
