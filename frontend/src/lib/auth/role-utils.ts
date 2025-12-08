import type { User } from "@supabase/supabase-js";
import type { SessionInfo } from "../../types";

/**
 * Determines the default landing page for a user based on their role and account status
 * @param user - Supabase user object
 * @param sessionInfo - Optional session info with isEnabled status
 * @returns The path to redirect to
 */
export function getDefaultRouteForUser(user: User | null, sessionInfo?: SessionInfo | null): string {
  if (!user) {
    return "/login";
  }

  // Check if user account is disabled
  if (sessionInfo && !sessionInfo.isEnabled) {
    return "/account-disabled";
  }

  // Use role from session info if available (authoritative), otherwise fallback to user metadata
  const role = sessionInfo?.role || user.user_metadata?.role;

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
