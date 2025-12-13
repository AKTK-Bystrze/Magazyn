import {
  MILLISECONDS_IN_DAY,
  MIDNIGHT_HOURS,
  MIDNIGHT_MINUTES,
  MIDNIGHT_SECONDS,
  MIDNIGHT_MILLISECONDS,
} from "@/lib/config/constants";

/**
 * Gets today's date at midnight (00:00:00.000)
 * Single source of truth for "today" calculation
 *
 * @returns Date object set to today at midnight
 */
export function getTodayAtMidnight(): Date {
  const today = new Date();
  today.setHours(
    MIDNIGHT_HOURS,
    MIDNIGHT_MINUTES,
    MIDNIGHT_SECONDS,
    MIDNIGHT_MILLISECONDS
  );
  return today;
}

/**
 * Gets today's date in YYYY-MM-DD format
 * Used for date input min/max attributes
 *
 * @returns Today's date as YYYY-MM-DD string
 */
export function getTodayAsString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Formats a date string to dd.mm format
 * Single source of truth for date formatting
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @returns Formatted date string (e.g., "11.12")
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}`;
}

/**
 * Calculates the number of days between two dates (inclusive)
 *
 * @param startDate - The start date in YYYY-MM-DD format
 * @param endDate - The end date in YYYY-MM-DD format
 * @returns The number of days
 */
export function calculateDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = Math.floor((end.getTime() - start.getTime()) / MILLISECONDS_IN_DAY) + 1;
  return days;
}

/**
 * Formats a date string for localized display
 * Used for user-facing date displays in tables and cards
 *
 * @param dateString - ISO 8601 date string
 * @param locale - Locale string (default: 'en-US')
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDateLocalized(
  dateString: string,
  locale: string = "en-US"
): string {
  try {
    return new Date(dateString).toLocaleDateString(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}
