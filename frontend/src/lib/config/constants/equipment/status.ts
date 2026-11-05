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

const EQUIPMENT_STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  broken: "destructive",
  blocked: "secondary",
};

/**
 * Returns badge variant based on equipment status
 */
export function getEquipmentStatusVariant(
  status: string | null | undefined
): "default" | "secondary" | "destructive" | "outline" {
  return (status && EQUIPMENT_STATUS_VARIANTS[status]) || "outline";
}
