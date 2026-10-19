/**
 * Reservation status configuration
 *
 * CRUCIAL: Status values must match database enum exactly.
 * Contains status enum, labels, variants, and filter options.
 *
 * @module lib/config/constants/reservation/status
 */

/**
 * Reservation status values matching database enum
 * CRUCIAL: Must match backend enum exactly
 */
export const RESERVATION_STATUS = {
  PENDING: "PENDING",
  RENTED: "RENTED",
  RETURNED: "RETURNED",
  CANCELLED: "CANCELLED",
} as const;

/**
 * Human-readable labels for reservation statuses
 */
export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  PENDING: "W trakcie",
  RENTED: "Wypożyczona",
  RETURNED: "Zwrócona",
  CANCELLED: "Anulowano",
  ALL: "Wszystkie statusy",
};

/**
 * Human-readable label for future pending reservations
 */
export const RESERVATION_FUTURE_STATUS_LABEL = "Przyszła";

/**
 * Human-readable label for overdue pending reservations
 */
export const RESERVATION_OVERDUE_STATUS_LABEL = "Zaległa";

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
  CANCELLED: "destructive",
};

/**
 * Status filter options for reservation lists (including 'ALL')
 */
export const RESERVATION_FILTER_OPTIONS = [
  { value: "ALL", label: "Wszystkie statusy" },
  { value: "PENDING", label: "W trakcie" },
  { value: "RENTED", label: "Wypożyczona" },
  { value: "RETURNED", label: "Zwrócona" },
  { value: "CANCELLED", label: "Anulowano" },
] as const;

/**
 * Sort options for reservation lists
 */
export const RESERVATION_SORT_OPTIONS = [
  { value: "created_desc", label: "Data utworzenia: najnowsze" },
  { value: "created_asc", label: "Data utworzenia: najstarsze" },
  { value: "start_date_asc", label: "Data rozpoczęcia: rosnąco" },
  { value: "start_date_desc", label: "Data rozpoczęcia: malejąco" },
  { value: "end_date_asc", label: "Data zakończenia: rosnąco" },
  { value: "end_date_desc", label: "Data zakończenia: malejąco" },
] as const;

export type ReservationSortOption = (typeof RESERVATION_SORT_OPTIONS)[number]["value"];

export const DEFAULT_STATUS_FILTER = "ALL";
export const DEFAULT_SORT_OPTION = "created_desc";
export const MIXED_STATUS = "MIXED";

/**
 * Checks whether any reservation filters or non-default sort are currently active.
 *
 * @param filters - The current reservation filter state
 * @returns True if any filter differs from default or has a value
 */
export function hasActiveReservationFilters(filters: {
  status: string;
  sort: string;
  search?: string;
  userId?: string;
  typeId?: string;
}): boolean {
  return (
    filters.status !== DEFAULT_STATUS_FILTER ||
    filters.sort !== DEFAULT_SORT_OPTION ||
    Boolean(filters.search) ||
    Boolean(filters.userId) ||
    Boolean(filters.typeId)
  );
}
