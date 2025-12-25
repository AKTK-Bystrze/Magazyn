/**
 * Equipment status configuration
 *
 * CRUCIAL: Status values must match database enum exactly.
 * Contains status enum, labels, variants, and filter options.
 *
 * @module lib/config/constants/equipment/status
 */

// =============================================================================
// STATUS ENUM (must match database)
// =============================================================================

/**
 * Equipment status values matching database enum
 * CRUCIAL: Must match backend enum exactly
 */
export const EQUIPMENT_STATUS = {
  OK: "ok",
  BROKEN: "broken",
  BLOCKED: "blocked",
} as const;

export type EquipmentStatus =
  (typeof EQUIPMENT_STATUS)[keyof typeof EQUIPMENT_STATUS];

// =============================================================================
// STATUS LABELS (Polish)
// =============================================================================

/**
 * Human-readable labels for equipment statuses
 */
export const EQUIPMENT_STATUS_LABELS: Record<string, string> = {
  ok: "OK",
  broken: "Zepsute",
  blocked: "Zablokowane",
  ALL: "Wszystkie statusy",
};

// =============================================================================
// FILTER OPTIONS
// =============================================================================

/**
 * Equipment status filter options for equipment lists (including 'ALL')
 */
export const EQUIPMENT_STATUS_FILTER_OPTIONS = [
  { value: "ALL", label: "Wszystkie statusy" },
  { value: "ok", label: "OK" },
  { value: "broken", label: "Zepsute" },
  { value: "blocked", label: "Zablokowane" },
] as const;

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_EQUIPMENT_STATUS_FILTER = "ALL";
