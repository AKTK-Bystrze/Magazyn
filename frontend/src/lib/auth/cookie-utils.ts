/**
 * Cookie management utilities
 * Centralizes all cookie operations to eliminate duplication and magic numbers
 */

import type { AstroCookies } from "astro";

export const AUTH_COOKIE_NAME = "magazyn-auth-token";

/**
 * Removes the authentication cookie and all Supabase auth cookies
 * Used during logout or when authentication fails
 */
export function removeAuthCookie(): void {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const name = cookie.split("=")[0].trim();
    if (name.startsWith("sb-") || name.startsWith("magazyn-")) {
      document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      document.cookie = `${name}=; path=/; domain=${window.location.hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
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
    if (name.startsWith("sb-") || name.startsWith("magazyn-")) {
      cookies.delete(name, { path: "/" });
    }
  }
}
