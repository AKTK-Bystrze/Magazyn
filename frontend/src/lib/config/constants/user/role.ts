/**
 * User role configuration
 *
 * CRUCIAL: Role values must match database enum exactly.
 * Contains role enum, labels, variants, and filter options.
 *
 * @module lib/config/constants/user/role
 */

// =============================================================================
// ROLE ENUM (must match database)
// =============================================================================

/**
 * User role values matching database enum
 * CRUCIAL: Must match backend enum exactly
 */
export const USER_ROLE = {
  USER: "user",
  ADMIN: "admin",
  SUPER_ADMIN: "super_admin",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// =============================================================================
// ROLE LABELS (Polish)
// =============================================================================

/**
 * Human-readable labels for user roles
 */
export const USER_ROLE_LABELS: Record<string, string> = {
  user: "Użytkownik",
  admin: "Administrator",
  super_admin: "Super Administrator",
  ALL: "Wszystkie role",
};

// =============================================================================
// ROLE VARIANTS (for Badge component)
// =============================================================================

/**
 * Badge variants for each user role
 * Maps to Shadcn Badge component variants
 */
export const USER_ROLE_VARIANTS: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  user: "outline",
  admin: "secondary",
  super_admin: "default",
};

// =============================================================================
// FILTER OPTIONS
// =============================================================================

/**
 * Role filter options for user lists (including 'ALL')
 */
export const USER_ROLE_FILTER_OPTIONS = [
  { value: "ALL", label: "Wszystkie role" },
  { value: "user", label: "Użytkownik" },
  { value: "admin", label: "Administrator" },
  { value: "super_admin", label: "Super Administrator" },
] as const;

// =============================================================================
// DEFAULTS
// =============================================================================

export const DEFAULT_ROLE_FILTER = "ALL";
