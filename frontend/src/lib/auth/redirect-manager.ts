import type { SessionInfo } from "../../types";
import { ROUTES } from "../config/routes";
import { validateRedirectUrl } from "./url-utils";
import { isAdmin } from "./roles";
import { defaultLogger as logger } from "@/lib/utils/logger";

/**
 * Minimal authenticated user shape required for redirect decisions.
 * Populated server-side by the middleware from the HttpOnly session cookie.
 */
export interface AuthUser {
  id: string;
  email?: string | null;
}

/**
 * Manages redirects with centralized logic
 *
 * This class centralizes redirect logic across middleware and page
 * components by providing a single source of truth for all redirect decisions.
 *
 * Note: Redirect loop detection is unnecessary as the redirect structure
 * creates a DAG - each redirect destination never redirects back unless
 * auth state changes (which requires a page load).
 */
/**
 * Main redirect logic - determines where to redirect based on auth state
 *
 * @param user - Authenticated user (null if not authenticated)
 * @param sessionInfo - Session info from backend (null if not fetched)
 * @param currentPath - Current URL pathname
 * @param redirectParam - Optional redirect parameter from query string
 * @param origin - Application origin (e.g., 'http://localhost:4321')
 * @returns URL to redirect to, or null if no redirect needed
 */
function getRedirectForAuthState(
  user: AuthUser | null,
  sessionInfo: SessionInfo | null,
  currentPath: string,
  redirectParam: string | null,
  origin: string
): string | null {
  if (!user || !sessionInfo) {
    if (currentPath === ROUTES.PUBLIC.LOGIN) {
      return null;
    }

    if (currentPath === "/") {
      return ROUTES.PUBLIC.LOGIN;
    }

    return `${ROUTES.PUBLIC.LOGIN}?redirect=${encodeURIComponent(currentPath)}`;
  }

  if (!sessionInfo.isEnabled) {
    if (currentPath === ROUTES.PROTECTED.ACCOUNT_DISABLED) {
      return null;
    }
    return ROUTES.PROTECTED.ACCOUNT_DISABLED;
  }

  if (currentPath === ROUTES.PROTECTED.ACCOUNT_DISABLED && sessionInfo.isEnabled) {
    return getDefaultRouteForUser(user, sessionInfo);
  }

  if (currentPath === ROUTES.PUBLIC.LOGIN) {
    if (redirectParam) {
      const safeRedirect = validateRedirectUrl(redirectParam, origin, ROUTES.PUBLIC.LOGIN);
      if (
        safeRedirect !== ROUTES.PUBLIC.LOGIN &&
        isRedirectAllowedForRole(safeRedirect, sessionInfo.role)
      ) {
        return safeRedirect;
      }
    }
    return getDefaultRouteForUser(user, sessionInfo);
  }

  if (currentPath.startsWith(ROUTES.PROTECTED.ADMIN) && !isAdmin(sessionInfo.role)) {
    return ROUTES.PROTECTED.DASHBOARD;
  }

  if (currentPath === "/") {
    return getDefaultRouteForUser(user, sessionInfo);
  }
  return null;
}

export const RedirectManager = {
  getRedirectForAuthState,
};

function isRedirectAllowedForRole(path: string, role: string | undefined): boolean {
  return !path.startsWith(ROUTES.PROTECTED.ADMIN) || isAdmin(role);
}

/**
 * Gets the default route for a user based on their role
 *
 * @param user - Authenticated user (can be null)
 * @param sessionInfo - Session info from backend (authoritative source)
 */
function getDefaultRouteForUser(user: AuthUser | null, sessionInfo: SessionInfo | null): string {
  if (!user || !sessionInfo) {
    logger.info("No user or sessionInfo available, redirecting to login");
    return ROUTES.PUBLIC.LOGIN;
  }

  if (!sessionInfo.isEnabled) {
    return ROUTES.PROTECTED.ACCOUNT_DISABLED;
  }

  return isAdmin(sessionInfo.role) ? ROUTES.PROTECTED.ADMIN : ROUTES.PROTECTED.DASHBOARD;
}
