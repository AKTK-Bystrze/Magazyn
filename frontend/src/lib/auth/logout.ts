/**
 * Logout Utility
 *
 * Centralized logout functionality for the application.
 * Handles cookie removal, localStorage cleanup, and redirection.
 *
 * @module lib/auth/logout
 */

import { removeAuthCookie } from "./cookie-utils";
import { ROUTES } from "@/lib/config/routes";
import { supabase } from "@/lib/supabase";
import { defaultLogger as logger } from "@/lib/utils/logger";

/**
 * Performs complete user logout
 *
 * This function:
 * 1. Signs out from Supabase (clears session)
 * 2. Removes the authentication cookie
 * 3. Clears Supabase auth token from localStorage
 * 4. Redirects to the login page
 *
 * @example
 * import { handleLogout } from '@/lib/auth/logout';
 *
 * <Button onClick={handleLogout}>Log out</Button>
 */
export async function handleLogout(): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    logger.debug("Supabase client signOut failed (likely already expired)", { error });
  }

  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch (e) {
    logger.error("Failed to call logout API", { error: e });
  }

  removeAuthCookie();

  if (typeof window !== "undefined") {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("sb-") || key.includes("supabase") || key.startsWith("magazyn-")) {
          localStorage.removeItem(key);
        }
      }
      sessionStorage.clear();
    } catch (e) {
      logger.debug("Failed to clear local/session storage", { error: e });
    }

    window.location.href = ROUTES.PUBLIC.LOGIN;
  }
}
