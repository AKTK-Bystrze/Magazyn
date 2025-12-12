/**
 * Cookie management utilities
 * Centralizes all cookie operations to eliminate duplication and magic numbers
 */

import {
  COOKIE_WAIT_TIMEOUT_MS,
  COOKIE_POLL_INTERVAL_MS,
  COOKIE_INITIAL_WAIT_MS,
  COOKIE_EXTENDED_WAIT_MS,
} from '@/lib/config/constants';

// Cookie configuration constants
export const AUTH_COOKIE_NAME = 'magazyn-auth-token';

// Max age: 1 year in seconds
// Broken down for clarity: 60 seconds * 60 minutes * 24 hours * 365 days
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Sets the authentication cookie with proper security attributes
 * 
 * Security attributes:
 * - path=/: Cookie available across entire site
 * - max-age: Cookie expires after 1 year
 * - SameSite=Lax: Provides CSRF protection while allowing normal navigation
 * 
 * @param accessToken - The Supabase access token to store
 * 
 * @example
 * setAuthCookie(session.access_token)
 */
export function setAuthCookie(accessToken: string): void {
  document.cookie = `${AUTH_COOKIE_NAME}=${accessToken}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Removes the authentication cookie
 * Used during logout or when authentication fails
 */
export function removeAuthCookie(): void {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}

/**
 * Gets the authentication token from cookies
 * 
 * @returns The token if found, null otherwise
 */
export function getAuthCookie(): string | null {
  const match = document.cookie.match(new RegExp(`(^| )${AUTH_COOKIE_NAME}=([^;]+)`));
  return match ? match[2] : null;
}

/**
 * Checks if the authentication cookie is set
 * 
 * @returns true if the cookie exists, false otherwise
 */
export function hasAuthCookie(): boolean {
  return document.cookie.includes(AUTH_COOKIE_NAME);
}

/**
 * Waits for cookie to be set (with timeout)
 * 
 * This is useful after setting a cookie, as there can be a small delay
 * before document.cookie reflects the change.
 * 
 * @param timeout - Maximum time to wait in milliseconds (default from constants)
 * @returns Promise that resolves to true if cookie was set, false if timeout
 * 
 * @example
 * setAuthCookie(token);
 * const success = await waitForCookie();
 * if (success) {
 *   // Cookie is confirmed set, safe to redirect
 * }
 */
export async function waitForCookie(timeout: number = COOKIE_WAIT_TIMEOUT_MS): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (hasAuthCookie()) {
      return true;
    }
    // Check every COOKIE_POLL_INTERVAL_MS
    await new Promise(resolve => setTimeout(resolve, COOKIE_POLL_INTERVAL_MS));
  }
  
  return false;
}

/**
 * Waits for cookie to be set, then performs a redirect
 * Combines cookie waiting with safe redirection
 * 
 * @param accessToken - The token to set in the cookie
 * @param redirectTo - The URL to redirect to after cookie is set
 */
export async function waitForCookieAndRedirect(
  accessToken: string,
  redirectTo: string
): Promise<void> {
  setAuthCookie(accessToken);
  
  // Wait a bit for cookie to be set
  await new Promise(resolve => setTimeout(resolve, COOKIE_INITIAL_WAIT_MS));
  
  // Double-check cookie is set
  if (!hasAuthCookie()) {
    console.warn('⚠️ Cookie not set after initial wait, waiting longer...');
    await new Promise(resolve => setTimeout(resolve, COOKIE_EXTENDED_WAIT_MS));
  }
  
  // Perform redirect
  window.location.replace(redirectTo);
}
