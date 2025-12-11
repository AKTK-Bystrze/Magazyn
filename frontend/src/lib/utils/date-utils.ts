import {
  MILLISECONDS_IN_DAY,
  MIDNIGHT_HOURS,
  MIDNIGHT_MINUTES,
  MIDNIGHT_SECONDS,
  MIDNIGHT_MILLISECONDS,
  DEFAULT_LOCALE,
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
 * Formats a date string to a human-readable format
 * Single source of truth for date formatting
 *
 * @param dateString - Date in YYYY-MM-DD format
 * @param locale - Locale for formatting (defaults to DEFAULT_LOCALE)
 * @returns Formatted date string (e.g., "December 11, 2025")
 */
export function formatDate(dateString: string, locale = DEFAULT_LOCALE): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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
