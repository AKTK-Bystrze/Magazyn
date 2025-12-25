import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from '../../db/database.types';

/**
 * User Role Constants
 * 
 * Single source of truth for all role string values used throughout the application.
 * Use these constants instead of hardcoded strings to prevent typos and enable refactoring.
 * 
 * @module lib/auth/roles
 * 
 * @example
 * import { ADMIN_ROLE, SUPER_ADMIN_ROLE, USER_ROLE } from '@/lib/auth/roles';
 * 
 * // Use in comparisons
 * if (sessionInfo.role === ADMIN_ROLE) { ... }
 * 
 * // Use in switch statements
 * switch (role) {
 *   case SUPER_ADMIN_ROLE:
 *   case ADMIN_ROLE:
 *     return '/admin';
 *   case USER_ROLE:
 *     return '/dashboard';
 * }
 */

/** Regular admin role - has access to admin panel */
export const ADMIN_ROLE = 'admin';

/** Super admin role - has full system access including user management */
export const SUPER_ADMIN_ROLE = 'super_admin';

/** Standard user role - has access to user dashboard only */
export const USER_ROLE = 'user';

/**
 * Union type of all possible user roles
 */
export type UserRole = typeof ADMIN_ROLE | typeof SUPER_ADMIN_ROLE | typeof USER_ROLE | string;

/**
 * Fetches the user's role from the profiles table
 * 
 * Note: This function queries the database directly. For most use cases,
 * prefer using sessionInfo.role from the backend which is already cached.
 * 
 * @param supabase - Supabase client instance
 * @param userId - The user's ID
 * @returns The user's role string, or null if not found
 */
export async function getUserRole(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data.role;
}

/**
 * Checks if a user has one of the allowed roles
 * 
 * Note: This function queries the database. For most use cases,
 * prefer using hasRole() from role-utils.ts with sessionInfo.
 * 
 * @param supabase - Supabase client instance
 * @param user - The user object
 * @param allowedRoles - Array of role strings to check against
 * @returns true if the user has one of the allowed roles
 */
export async function requireRole(
  supabase: SupabaseClient<Database>,
  user: User,
  allowedRoles: string[]
): Promise<boolean> {
  if (!user) return false;
  
  const role = await getUserRole(supabase, user.id);
  return role ? allowedRoles.includes(role) : false;
}
