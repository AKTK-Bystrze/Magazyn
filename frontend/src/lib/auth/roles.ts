import { USER_ROLE as USER_ROLES } from "@/lib/config/constants/user/role";

/**
 * User Role Constants
 *
 * Single source of truth for all role string values used throughout the application.
 * Use these constants instead of hardcoded strings to prevent typos and enable refactoring.
 *
 * @module lib/auth/roles
 *
 * @example
 * import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from '@/lib/auth/roles';
 * import { USER_ROLE } from '@/lib/config/constants/user/role';
 *
 * // Use in comparisons
 * if (sessionInfo.role === ADMIN_ROLE) { ... }
 *
 * // Use in switch statements
 * switch (role) {
 *   case SUPER_ADMIN_ROLE:
 *   case ADMIN_ROLE:
 *     return '/admin';
 *   case USER_ROLE.USER:
 *     return '/dashboard';
 * }
 */

/** Regular admin role - has access to admin panel */
export const ADMIN_ROLE = USER_ROLES.ADMIN;

/** Super admin role - has full system access including user management */
export const SUPER_ADMIN_ROLE = USER_ROLES.SUPER_ADMIN;

/**
 * Union type of all possible user roles
 */
export type UserRole =
  typeof ADMIN_ROLE | typeof SUPER_ADMIN_ROLE | typeof USER_ROLES.USER | string;
