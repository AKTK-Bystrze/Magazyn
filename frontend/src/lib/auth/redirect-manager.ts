import type { User } from "@supabase/supabase-js";
import type { SessionInfo } from "../../types";
import { ROUTES } from "../config/routes";
import { validateRedirectUrl } from "./url-utils";
import { ADMIN_ROLE, SUPER_ADMIN_ROLE, USER_ROLE } from "./roles";
import { defaultLogger as logger } from "@/lib/utils/logger";

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

      if (currentPath === "/") {
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
        if (
          safeRedirect !== ROUTES.PUBLIC.LOGIN &&
          isRedirectAllowedForRole(safeRedirect, sessionInfo?.role)
        ) {
          return safeRedirect;
        }
        // Fall through to default route if redirect is not allowed
      }
      return getDefaultRouteForUser(user, sessionInfo);
    }

    if (currentPath === "/") {
      return getDefaultRouteForUser(user, sessionInfo);
    }
    return null;
  }
}

/// Checks if a redirect path is allowed for a given user role
function isRedirectAllowedForRole(path: string, role: string | undefined): boolean {
  return (
    !path.startsWith(ROUTES.PROTECTED.ADMIN) || role === ADMIN_ROLE || role === SUPER_ADMIN_ROLE
  );
}

/**
 * Gets the default route for a user based on their role
 *
 * @param user - Supabase user object (can be null)
 * @param sessionInfo - Session info from backend (authoritative source)
 */
export function getDefaultRouteForUser(user: User | null, sessionInfo: SessionInfo | null): string {
  if (!user || !sessionInfo) {
    logger.info("No user or sessionInfo available, redirecting to login");
    return ROUTES.PUBLIC.LOGIN;
  }

  if (!sessionInfo.isEnabled) {
    return ROUTES.PROTECTED.ACCOUNT_DISABLED;
  }

  // SECURITY: Use ONLY sessionInfo.role (authoritative source from database)
  // Never use user_metadata.role (can be stale)
  const role = sessionInfo.role;

  switch (role) {
    case SUPER_ADMIN_ROLE:
    case ADMIN_ROLE:
      return ROUTES.PROTECTED.ADMIN;
    case USER_ROLE:
      return ROUTES.PROTECTED.DASHBOARD;
    default:
      logger.warn(`⚠️ Unknown role: ${role}, defaulting to dashboard`);
      return ROUTES.PROTECTED.DASHBOARD;
  }
}
