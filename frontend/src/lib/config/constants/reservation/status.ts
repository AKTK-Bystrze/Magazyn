/**
 * Reservation status configuration
 *
 * CRUCIAL: Status values must match database enum exactly.
 * Contains status enum, labels, variants, and filter options.
 *
 * @module lib/config/constants/reservation/status
 */

// =============================================================================
// STATUS ENUM (must match database)
// =============================================================================

/**
 * Reservation status values matching database enum
 * CRUCIAL: Must match backend enum exactly
 */
export const RESERVATION_STATUS = {
  PENDING: "PENDING",
  RENTED: "RENTED",
  RETURNED: "RETURNED",
  DENIED: "DENIED",
} as const;

export type ReservationStatus =
  (typeof RESERVATION_STATUS)[keyof typeof RESERVATION_STATUS];

// =============================================================================
// STATUS LABELS (Polish)
// =============================================================================

/**
 * Human-readable labels for reservation statuses
 */
export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "Oczekująca",
  RENTED: "Wypożyczona",
  RETURNED: "Zwrócona",
  DENIED: "Anulowana",
  ALL: "Wszystkie statusy",
};

// =============================================================================
// STATUS VARIANTS (for Badge component)
// =============================================================================

/**
 * Badge variants for each reservation status
 * Maps to Shadcn Badge component variants
 */
export const RESERVATION_STATUS_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PENDING: "default",
  RENTED: "secondary",
  RETURNED: "outline",
  DENIED: "destructive",
};

// =============================================================================
// FILTER & SORT OPTIONS
// =============================================================================

/**
 * Status filter options for reservation lists (including 'ALL')
 */
export const RESERVATION_FILTER_OPTIONS = [
  { value: "ALL", label: "Wszystkie statusy" },
  { value: "PENDING", label: "Oczekująca" },
  { value: "RENTED", label: "Wypożyczona" },
  { value: "RETURNED", label: "Zwrócona" },
  { value: "DENIED", label: "Anulowana" },
] as const;

/**
 * Sort options for reservation lists
 */
export const RESERVATION_SORT_OPTIONS = [
  { value: "created_desc", label: "Najnowsze" },
  { value: "date_asc", label: "Data rozpoczęcia (rosnąco)" },
  { value: "date_desc", label: "Data rozpoczęcia (malejąco)" },
] as const;

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_STATUS_FILTER = "ALL";
export const DEFAULT_SORT_OPTION = "created_desc";
export const MIXED_STATUS = "MIXED";
