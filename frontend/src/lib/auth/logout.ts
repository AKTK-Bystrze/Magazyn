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
import { STORAGE_KEY_SUPABASE_AUTH } from "@/lib/config/constants";
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
    // Sign out from Supabase - this clears the session
    await supabase.auth.signOut();
  } catch (error) {
    logger.error("Logout error:", { error });
    // Continue with local cleanup even if server logout fails
  }

  // Call server-side logout to clear cookies reliably
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch (e) {
    logger.error("Failed to call logout API", { error: e });
  }

  // Remove auth cookie
  removeAuthCookie();

  // Clear Supabase auth token from localStorage
  localStorage.removeItem(STORAGE_KEY_SUPABASE_AUTH);

  // Redirect to login page
  window.location.href = ROUTES.PUBLIC.LOGIN;
}
