import type { User } from '@supabase/supabase-js';
import type { SessionInfo } from '../../types';
import { ROUTES } from '../config/routes';
import { validateRedirectUrl } from './url-utils';

/**
 * Manages redirects with loop prevention and centralized logic
 * 
 * This class eliminates the 38% code duplication across middleware,
 * AuthListener, and page components by providing a single source of
 * truth for all redirect decisions.
 */
export class RedirectManager {
  private static redirectHistory: Array<{ from: string; to: string; timestamp: number }> = [];
  private static readonly MAX_REDIRECTS = 3;
  private static readonly HISTORY_TIMEOUT = 5000; // 5 seconds

  /**
   * Clears redirect history older than timeout
   * Prevents false positives from old navigation
   */
  private static cleanHistory(): void {
    const now = Date.now();
    this.redirectHistory = this.redirectHistory.filter(
      entry => now - entry.timestamp < this.HISTORY_TIMEOUT
    );
  }

  /**
   * Checks if a redirect would create a loop
   * 
   * @param from - Current path
   * @param to - Target path
   * @returns false if loop detected, true if safe to redirect
   */
  static canRedirect(from: string, to: string): boolean {
    this.cleanHistory();

    // Check redirect count
    if (this.redirectHistory.length >= this.MAX_REDIRECTS) {
      console.error('🚨 Redirect loop detected - too many redirects:', this.redirectHistory);
      return false;
    }

    // Check for circular redirect (A → B → A)
    if (this.redirectHistory.some(entry => entry.from === to && entry.to === from)) {
      console.error('🚨 Circular redirect detected:', { from, to });
      return false;
    }

    return true;
  }

  /**
   * Records a redirect for loop detection
   * Call this before performing actual redirect
   */
  static recordRedirect(from: string, to: string): void {
    this.redirectHistory.push({
      from,
      to,
      timestamp: Date.now(),
    });
  }

  /**
   * Resets redirect history
   * Used in tests and after successful navigation
   */
  static reset(): void {
    this.redirectHistory = [];
  }

  /**
   * Main redirect logic - determines where to redirect based on auth state
   * 
   * This is the single source of truth for ALL redirect decisions.
   * Replaces duplicated logic in middleware and AuthListener.
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
    // =========================================================================
    // UNAUTHENTICATED USERS
    // =========================================================================
    if (!user) {
      // Already on login page - no redirect needed
      if (currentPath === ROUTES.PUBLIC.LOGIN) {
        return null;
      }
      
      // Redirect to login with return URL
      if (currentPath === '/') {
        return ROUTES.PUBLIC.LOGIN;
      }
      
      return `${ROUTES.PUBLIC.LOGIN}?redirect=${encodeURIComponent(currentPath)}`;
    }

    // =========================================================================
    // DISABLED USERS
    // =========================================================================
    if (sessionInfo && !sessionInfo.isEnabled) {
      // Already on account-disabled page - no redirect needed
      if (currentPath === ROUTES.PROTECTED.ACCOUNT_DISABLED) {
        return null;
      }
      
      // Redirect to account-disabled
      return ROUTES.PROTECTED.ACCOUNT_DISABLED;
    }

    // =========================================================================
    // ENABLED USERS ON ACCOUNT-DISABLED PAGE
    // =========================================================================
    if (currentPath === ROUTES.PROTECTED.ACCOUNT_DISABLED && sessionInfo?.isEnabled) {
      return getDefaultRouteForUser(user, sessionInfo);
    }

    // =========================================================================
    // AUTHENTICATED USERS ON LOGIN PAGE
    // =========================================================================
    if (currentPath === ROUTES.PUBLIC.LOGIN) {
      // Check for safe redirect parameter
      if (redirectParam) {
        const safeRedirect = validateRedirectUrl(redirectParam, origin, ROUTES.PUBLIC.LOGIN);
        if (safeRedirect !== ROUTES.PUBLIC.LOGIN) {
          return safeRedirect;
        }
      }
      
      // Redirect to default route based on role
      return getDefaultRouteForUser(user, sessionInfo);
    }

    // =========================================================================
    // ROOT PATH
    // =========================================================================
    if (currentPath === '/') {
      return getDefaultRouteForUser(user, sessionInfo);
    }

    // =========================================================================
    // NO REDIRECT NEEDED
    // =========================================================================
    return null;
  }
}

/**
 * Gets the default route for a user based on their role
 * 
 * SECURITY: Uses ONLY sessionInfo.role (from backend database with RLS)
 * Never falls back to user_metadata.role (can be stale)
 * 
 * @param user - Supabase user object
 * @param sessionInfo - Session info from backend (authoritative source)
 * @returns Default route path for the user
 */
export function getDefaultRouteForUser(
  user: User,
  sessionInfo: SessionInfo | null
): string {
  // If no sessionInfo, redirect to login (fail-safe)
  if (!sessionInfo) {
    console.warn('⚠️ No sessionInfo available, redirecting to login');
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
    case 'super_admin':
    case 'admin':
      return ROUTES.PROTECTED.ADMIN;
    case 'user':
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
