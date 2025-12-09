import type { User } from "@supabase/supabase-js";
import type { SessionInfo } from "../../types";
import { ADMIN_ROLE, SUPER_ADMIN_ROLE } from './roles';
import {
  getDefaultRouteForUser as getDefaultRouteForUserBase,
  hasRole as hasRoleBase
} from "./redirect-manager";

/**
 * Re-exported from redirect-manager.ts for backward compatibility
 * 
 * SINGLE SOURCE OF TRUTH: The actual implementation is in redirect-manager.ts
 * This re-export maintains the existing API for components that import from role-utils
 * 
 * @see redirect-manager.ts for implementation details
 */
export function getDefaultRouteForUser(user: User | null, sessionInfo?: SessionInfo | null): string {
  return getDefaultRouteForUserBase(user, sessionInfo || null);
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
  return role === ADMIN_ROLE || role === SUPER_ADMIN_ROLE;
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
  return sessionInfo.role === SUPER_ADMIN_ROLE;
}

/**
 * Checks if a user has one of the specified roles
 * Wrapper around redirect-manager's hasRole for sessionInfo-based API
 * 
 * @param sessionInfo - Session info from backend
 * @param allowedRoles - Array of allowed roles
 * @returns true if user has one of the allowed roles
 */
export function hasRole(
  sessionInfo: SessionInfo | null,
  allowedRoles: string[]
): boolean {
  return hasRoleBase(sessionInfo?.role, allowedRoles);
}
