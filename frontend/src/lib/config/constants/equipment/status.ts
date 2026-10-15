/**
 * Equipment status configuration
 *
 * CRUCIAL: Status values must match database enum exactly.
 * Contains status enum, labels, variants, and filter options.
 *
 * @module lib/config/constants/equipment/status
 */

/**
 * Equipment status values matching database enum
 * CRUCIAL: Must match backend enum exactly
 */
export const EQUIPMENT_STATUS = {
  OK: "ok",
  BROKEN: "broken",
  BLOCKED: "blocked",
} as const;

/**
 * Human-readable labels for equipment statuses
 */
export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  broken: "Zepsute",
  blocked: "Zablokowane",
  ALL: "Wszystkie statusy",
};
