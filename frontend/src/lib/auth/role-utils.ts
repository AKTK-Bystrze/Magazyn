import type { User } from "@supabase/supabase-js";

/**
 * Determines the default landing page for a user based on their role
 * @param user - Supabase user object
 * @returns The path to redirect to
 */
export function getDefaultRouteForUser(user: User | null): string {
  if (!user) {
    return "/login";
  }

  const role = user.user_metadata?.role;

  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin";
    case "user":
      return "/dashboard";
    default:
      // Fallback for users without a role set
      return "/dashboard";
  }
}

/**
 * Checks if a user has admin privileges
 * @param user - Supabase user object
 * @returns true if user is admin or super_admin
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false;
  const role = user.user_metadata?.role;
  return role === "admin" || role === "super_admin";
}

/**
 * Checks if a user is a super admin
 * @param user - Supabase user object
 * @returns true if user is super_admin
 */
export function isSuperAdmin(user: User | null): boolean {
  if (!user) return false;
  return user.user_metadata?.role === "super_admin";
}
