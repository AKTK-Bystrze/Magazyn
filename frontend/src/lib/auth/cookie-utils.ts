/**
 * Cookie management utilities
 * Centralizes all cookie operations to eliminate duplication and magic numbers
 */

import type { AstroCookies } from "astro";

export const AUTH_COOKIE_NAME = "magazyn-auth-token";
export const BASE_AUTH_COOKIE_NAMES = ["sb-magazyn-auth-token", "magazyn-auth-token"] as const;

/**
 * Removes the authentication cookie and all Supabase auth cookies.
 * Used during logout or when authentication fails.
 *
 * Implements RFC 6265 dual-scope eviction by generating base names and chunk suffixes (.0 to .9),
 * as well as parsing existing document.cookie entries, issuing deletion headers for both
 * host-only and domain-scoped contexts.
 */
export function removeAuthCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  const namesToDelete = new Set<string>();

  for (const base of BASE_AUTH_COOKIE_NAMES) {
    namesToDelete.add(base);
    for (let i = 0; i <= 9; i++) {
      namesToDelete.add(`${base}.${i}`);
    }
  }

  if (document.cookie) {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const name = cookie.split("=")[0].trim();
      if (name.startsWith("sb-") || name.startsWith("magazyn-")) {
        namesToDelete.add(name);
      }
    }
  }

  const hostname =
    typeof window !== "undefined" && window.location?.hostname ? window.location.hostname : "";

  for (const name of namesToDelete) {
    document.cookie = `${name}=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;

    if (hostname) {
      document.cookie = `${name}=; path=/; domain=${hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }
}

/**
 * Clears all authentication cookies from the server side (SSR).
 * Parses the raw request headers to find any chunked Supabase cookies and deletes them,
 * while ensuring base names and chunks .0 through .9 are always deleted with path: "/".
 *
 * @param request - The incoming HTTP request
 * @param cookies - Astro's cookie handling interface
 */
export function clearAllAuthCookies(request: Request, cookies: AstroCookies): void {
  const namesToDelete = new Set<string>();

  for (const base of BASE_AUTH_COOKIE_NAMES) {
    namesToDelete.add(base);
    for (let i = 0; i <= 9; i++) {
      namesToDelete.add(`${base}.${i}`);
    }
  }

  const cookieHeader = request.headers.get("Cookie") || "";
  if (cookieHeader) {
    const cookieNames = cookieHeader.split(";").map((c) => c.split("=")[0].trim());
    for (const name of cookieNames) {
      if (name.startsWith("sb-") || name.startsWith("magazyn-")) {
        namesToDelete.add(name);
      }
    }
  }

  for (const name of namesToDelete) {
    cookies.delete(name, { path: "/" });
  }
}
