/**
 * Cookie management utilities
 * Centralizes all cookie operations to eliminate duplication and magic numbers
 */

import type { AstroCookies } from "astro";

export const AUTH_COOKIE_NAME = "magazyn-auth-token";

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Removes the authentication cookie
 * Used during logout or when authentication fails
 */
export function removeAuthCookie(): void {
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;

  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; domain=${window.location.hostname}; max-age=0`;

  if (window.location.hostname === "localhost") {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; domain=localhost; max-age=0`;
  }
}

/**
 * Clears all authentication cookies from the server side (SSR).
 * Parses the raw request headers to find any chunked Supabase cookies and deletes them.
 */
export function clearAllAuthCookies(request: Request, cookies: AstroCookies): void {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookieNames = cookieHeader.split(";").map((c) => c.split("=")[0].trim());

  for (const name of cookieNames) {
    if (
      name.startsWith("sb-magazyn-auth-token") ||
      name.startsWith("sb-access-token") ||
      name.startsWith("sb-refresh-token") ||
      name.startsWith("sb-session-token") ||
      name === AUTH_COOKIE_NAME
    ) {
      cookies.delete(name, { path: "/" });
    }
  }
}
