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
  today.setHours(MIDNIGHT_HOURS, MIDNIGHT_MINUTES, MIDNIGHT_SECONDS, MIDNIGHT_MILLISECONDS);
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
 * Formats a date string or Date object to DD/MM/YYYY format
 * Single source of truth for date formatting
 *
 * @param date - Date in YYYY-MM-DD format, ISO string, or Date object
 * @returns Formatted date string (e.g., "11/12/2024")
 */
export function formatDate(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return typeof date === "string" ? date : "";
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return typeof date === "string" ? date : "";
  }
}

/**
 * Formats a date string or Date object to DD/MM/YYYY HH:mm format
 *
 * @param date - Date string (ISO 8601) or Date object
 * @returns Formatted date-time string (e.g., "15/01/2024 14:30")
 */
export function formatDateTime(date: string | Date): string {
  try {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return typeof date === "string" ? date : "";
    }
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return typeof date === "string" ? date : "";
  }
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
 * Formats a date string as relative time
 * Used for audit trails and activity logs
 *
 * @param dateString - ISO 8601 date string
 * @returns Relative time string (e.g., "2 days ago", "just now")
 */
export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return "just now";
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
    } else if (diffHour < 24) {
      return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
    } else if (diffDay < 30) {
      return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
    } else {
      const diffMonth = Math.floor(diffDay / 30);
      return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
    }
  } catch {
    return dateString;
  }
}
