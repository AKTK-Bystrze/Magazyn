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

/**
 * Performs complete user logout
 *
 * This function:
 * 1. Removes the authentication cookie
 * 2. Clears Supabase auth token from localStorage
 * 3. Redirects to the login page
 *
 * @example
 * import { handleLogout } from '@/lib/auth/logout';
 *
 * <Button onClick={handleLogout}>Log out</Button>
 */
export function handleLogout(): void {
  // Remove auth cookie
  removeAuthCookie();

  // Clear Supabase auth token from localStorage
  localStorage.removeItem(STORAGE_KEY_SUPABASE_AUTH);

  // Redirect to login page
  window.location.href = ROUTES.PUBLIC.LOGIN;
}
