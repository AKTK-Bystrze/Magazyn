/**
 * Error messages for cart validation
 * Centralized to ensure consistency across the application
 */

// Date validation errors
export const ERROR_START_DATE_PAST = "Start date must be in the future";
export const ERROR_END_DATE_BEFORE_START = "End date must be after start date";

// Availability errors
export const ERROR_ITEMS_UNAVAILABLE = (count: number) =>
  `${count} item(s) unavailable`;
export const ERROR_UNAVAILABLE_FOR_DATES = "Unavailable for selected dates";

// Credit balance errors
export const ERROR_INSUFFICIENT_CREDITS = (needed: number) =>
  `Insufficient credits. You need ${needed} more credits.`;

// General errors
export const ERROR_AVAILABILITY_CHECK_FAILED = "Failed to check availability";
export const ERROR_SELECT_DATES = "Please select both start and end dates to continue.";
