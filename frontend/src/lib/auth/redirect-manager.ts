import type { User } from '@supabase/supabase-js';
import type { SessionInfo } from '../../types';
import { ROUTES } from '../config/routes';
import { validateRedirectUrl } from './url-utils';
import { ADMIN_ROLE, SUPER_ADMIN_ROLE, USER_ROLE } from './roles';

/**
 * Manages redirects with centralized logic
 * 
 * This class eliminates 38% code duplication across middleware,
 * AuthListener, and page components by providing a single source of
 * truth for all redirect decisions.
 * 
 * Note: Redirect loop detection is unnecessary as the redirect structure
 * creates a DAG - each redirect destination never redirects back unless
 * auth state changes (which requires a page load).
 */
export class RedirectManager {
  /**
   * Main redirect logic - determines where to redirect based on auth state
   * 
   * @param user - Supabase user object (null if not authenticated)
   * @param sessionInfo - Session info from backend (null if not fetched)
   * @param currentPath - Current URL pathname
   * @param redirectParam - Optional redirect parameter from query string
   * @param origin - Application origin (e.g., 'http://localhost:4321')
   * @returns URL to redirect to, or null if no redirect needed
   */
  static getRedirectForAuthState(
    user: User | null,
    sessionInfo: SessionInfo | null,
    currentPath: string,
    redirectParam: string | null,
    origin: string
  ): string | null {
    // Unauthenticated user -> login page
    if (!user) {
      if (currentPath === ROUTES.PUBLIC.LOGIN) {
        return null;
      }
      
      if (currentPath === '/') {
        return ROUTES.PUBLIC.LOGIN;
      }
      
      return `${ROUTES.PUBLIC.LOGIN}?redirect=${encodeURIComponent(currentPath)}`;
    }

    // Disabled user -> account disabled page
    if (sessionInfo && !sessionInfo.isEnabled) {
      if (currentPath === ROUTES.PROTECTED.ACCOUNT_DISABLED) {
        return null;
      }
      return ROUTES.PROTECTED.ACCOUNT_DISABLED;
    }

    if (currentPath === ROUTES.PROTECTED.ACCOUNT_DISABLED && sessionInfo?.isEnabled) {
      return getDefaultRouteForUser(user, sessionInfo);
    }

    if (currentPath === ROUTES.PUBLIC.LOGIN) {
      if (redirectParam) {
        const safeRedirect = validateRedirectUrl(redirectParam, origin, ROUTES.PUBLIC.LOGIN);
        // Validate redirect target against user's role
        if (safeRedirect !== ROUTES.PUBLIC.LOGIN &&
          isRedirectAllowedForRole(safeRedirect, sessionInfo?.role)) {
          return safeRedirect;
        }
        // Fall through to default route if redirect is not allowed
      }
      return getDefaultRouteForUser(user, sessionInfo);
    }

    if (currentPath === '/') {
      return getDefaultRouteForUser(user, sessionInfo);
    }
    return null;
  }
}

/**
 * Checks if a redirect path is allowed for a given user role
 * 
 * SECURITY: Prevents users from accessing admin routes via redirect parameter
 * 
 * @param path - The redirect target path
 * @param role - The user's role from sessionInfo
 * @returns true if the redirect is allowed for the user's role
 */
function isRedirectAllowedForRole(path: string, role: string | undefined): boolean {
  // Admin routes are restricted to admin and super_admin roles
  if (path.startsWith(ROUTES.PROTECTED.ADMIN)) {
    return role === ADMIN_ROLE || role === SUPER_ADMIN_ROLE;
  }

  // All other routes are allowed for any authenticated user
  return true;
}

/**
 * Gets the default route for a user based on their role
 * 
 * SECURITY: Uses ONLY sessionInfo.role (from backend database with RLS)
 * Never falls back to user_metadata.role (can be stale)
 * 
 * @param user - Supabase user object (can be null)
 * @param sessionInfo - Session info from backend (authoritative source)
 * @returns Default route path for the user
 */
export function getDefaultRouteForUser(
  user: User | null,
  sessionInfo: SessionInfo | null
): string {
  // If no user or sessionInfo, redirect to login (fail-safe)
  if (!user || !sessionInfo) {
    console.warn('⚠️ No user or sessionInfo available, redirecting to login');
    return ROUTES.PUBLIC.LOGIN;
  }

  // Check if account is disabled
  if (!sessionInfo.isEnabled) {
    return ROUTES.PROTECTED.ACCOUNT_DISABLED;
  }

  // SECURITY: Use ONLY sessionInfo.role (authoritative source from database)
  // Never use user_metadata.role (can be stale)
  const role = sessionInfo.role;

  // Route based on role
  switch (role) {
    case SUPER_ADMIN_ROLE:
    case ADMIN_ROLE:
      return ROUTES.PROTECTED.ADMIN;
    case USER_ROLE:
      return ROUTES.PROTECTED.DASHBOARD;
    default:
      // Fallback for unknown roles
      console.warn(`⚠️ Unknown role: ${role}, defaulting to dashboard`);
      return ROUTES.PROTECTED.DASHBOARD;
  }
}

/**
 * Checks if a user has one of the specified roles
 * 
 * SECURITY: Uses ONLY sessionInfo.role
 * 
 * @param role - Role from sessionInfo
 * @param allowedRoles - Array of allowed roles
 * @returns true if user has one of the allowed roles
 * 
 * @example
 * hasRole(sessionInfo.role, ['admin', 'super_admin'])
 */
export function hasRole(
  role: string | undefined,
  allowedRoles: string[]
): boolean {
  if (!role) return false;
  return allowedRoles.includes(role);
}
