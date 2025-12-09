import type { User } from "@supabase/supabase-js";
import type { SessionInfo } from "../../types";
import { ROUTES } from "../config/routes";

/**
 * Determines the default landing page for a user based on their role and account status
 * 
 * SECURITY: Uses ONLY sessionInfo.role (from backend database with RLS)
 * Never falls back to user_metadata.role (can be stale)
 * 
 * @param user - Supabase user object
 * @param sessionInfo - Session info with isEnabled status (REQUIRED)
 * @returns The path to redirect to
 */
export function getDefaultRouteForUser(user: User | null, sessionInfo?: SessionInfo | null): string {
  if (!user) {
    return ROUTES.PUBLIC.LOGIN;
  }

  // If no sessionInfo, redirect to login (fail-safe)
  if (!sessionInfo) {
    console.warn('⚠️ No sessionInfo available in getDefaultRouteForUser, redirecting to login');
    return ROUTES.PUBLIC.LOGIN;
  }

  // Check if user account is disabled
  if (!sessionInfo.isEnabled) {
    return ROUTES.PROTECTED.ACCOUNT_DISABLED;
  }

  // SECURITY: Use ONLY sessionInfo.role (authoritative source from database)  
  const role = sessionInfo.role;

  switch (role) {
    case "super_admin":
    case "admin":
      return ROUTES.PROTECTED.ADMIN;
    case "user":
      return ROUTES.PROTECTED.DASHBOARD;
    default:
      // Fallback for users without a role set
      console.warn(`⚠️ Unknown role: ${role}, defaulting to dashboard`);
      return ROUTES.PROTECTED.DASHBOARD;
  }
}

/**
 * Checks if a user has admin privileges
 * 
 * SECURITY: Uses sessionInfo.role (not user_metadata)
 * 
 * @param sessionInfo - Session info from backend
 * @returns true if user is admin or super_admin
 */
export function isAdmin(sessionInfo: SessionInfo | null): boolean {
  if (!sessionInfo) return false;
  const role = sessionInfo.role;
  return role === "admin" || role === "super_admin";
}

/**
 * Checks if a user is a super admin
 * 
 * SECURITY: Uses sessionInfo.role (not user_metadata)
 * 
 * @param sessionInfo - Session info from backend
 * @returns true if user is super_admin
 */
export function isSuperAdmin(sessionInfo: SessionInfo | null): boolean {
  if (!sessionInfo) return false;
  return sessionInfo.role === "super_admin";
}

/**
 * Checks if a user has one of the specified roles
 * 
 * @param sessionInfo - Session info from backend
 * @param allowedRoles - Array of allowed roles
 * @returns true if user has one of the allowed roles
 */
export function hasRole(
  sessionInfo: SessionInfo | null,
  allowedRoles: string[]
): boolean {
  if (!sessionInfo || !sessionInfo.role) return false;
  return allowedRoles.includes(sessionInfo.role);
}
