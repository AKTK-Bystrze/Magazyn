/**
 * Cookie management utilities
 * Centralizes all cookie operations to eliminate duplication and magic numbers
 */

import { parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

export const AUTH_COOKIE_NAME = "sb-magazyn-auth-token";
export const CHUNKED_COOKIE_REGEX = /^sb-magazyn-auth-token\.\d+$/;
export const BASE_AUTH_COOKIE_NAMES = ["sb-magazyn-auth-token", "magazyn-auth-token"] as const;

/**
 * Expires a cookie on document.cookie for both host-only and domain scopes.
 *
 * @param name - Cookie name to delete
 * @param domain - Optional domain for dual-scope eviction
 * @param path - Cookie path (defaults to '/')
 */
function expireBrowserCookie(name: string, domain?: string, path = "/"): void {
  document.cookie = `${name}=; path=${path}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (domain) {
    document.cookie = `${name}=; path=${path}; domain=${domain}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  }
}

/**
 * Filters an array of parsed cookies to enforce bilateral read-side pruning.
 * If chunked cookies (e.g. `sb-magazyn-auth-token.0`) are present with non-empty values,
 * the unchunked base cookie (`sb-magazyn-auth-token`) is suppressed so `@supabase/ssr`
 * `combineChunks()` is forced to reconstruct the chunks rather than early-exiting on a stale base token.
 *
 * @param cookies - Array of cookie objects with name and value
 * @returns Pruned array of cookies
 */
export function pruneCookieList(
  cookies: Array<{ name: string; value: string }>
): Array<{ name: string; value: string }> {
  const hasChunks = cookies.some((c) => CHUNKED_COOKIE_REGEX.test(c.name) && Boolean(c.value));
  return hasChunks ? cookies.filter((c) => c.name !== AUTH_COOKIE_NAME) : cookies;
}

/**
 * Creates cookie handlers for the Supabase browser client with bilateral pruning.
 * Symmetrically mirrors the SSR cookie pruning logic to prevent split-brain session states.
 *
 * @returns Cookie methods object with getAll and setAll implementations
 */
export function createBrowserCookieMethods() {
  return {
    getAll(): Array<{ name: string; value: string }> {
      if (typeof document === "undefined") {
        return [];
      }
      return pruneCookieList(parseCookieHeader(document.cookie || ""));
    },

    setAll(
      cookiesToSet: Array<{
        name: string;
        value: string;
        options?: {
          path?: string;
          domain?: string;
          maxAge?: number;
          sameSite?: string;
          secure?: boolean;
        };
      }>
    ): void {
      if (typeof document === "undefined") {
        return;
      }

      const hostname =
        typeof window !== "undefined" && window.location?.hostname ? window.location.hostname : "";
      const isWritingChunked = cookiesToSet.some(
        (c) => CHUNKED_COOKIE_REGEX.test(c.name) && Boolean(c.value) && c.options?.maxAge !== 0
      );
      const isWritingBase =
        !isWritingChunked &&
        cookiesToSet.some(
          (c) => c.name === AUTH_COOKIE_NAME && Boolean(c.value) && c.options?.maxAge !== 0
        );

      if (isWritingChunked) {
        expireBrowserCookie(AUTH_COOKIE_NAME, hostname);
      }

      if (isWritingBase) {
        const chunkNames = Array.from({ length: 10 }, (_, i) => `${AUTH_COOKIE_NAME}.${i}`);
        if (document.cookie) {
          document.cookie.split(";").forEach((c) => {
            const name = c.split("=")[0].trim();
            if (CHUNKED_COOKIE_REGEX.test(name)) chunkNames.push(name);
          });
        }
        for (const name of new Set(chunkNames)) {
          expireBrowserCookie(name, hostname);
        }
      }

      cookiesToSet.forEach(({ name, value, options }) => {
        if (isWritingChunked && name === AUTH_COOKIE_NAME) return;
        if (isWritingBase && CHUNKED_COOKIE_REGEX.test(name)) return;

        const path = options?.path ?? "/";
        const domain = options?.domain || hostname;

        if (!value || options?.maxAge === 0) {
          expireBrowserCookie(name, domain, path);
        } else {
          let cookieStr = `${name}=${value}; path=${path}; samesite=${options?.sameSite || "lax"}`;
          if (options?.maxAge !== undefined) {
            cookieStr += `; max-age=${options.maxAge}`;
          }
          if (options?.domain) {
            cookieStr += `; domain=${options.domain}`;
          }
          if (options?.secure) {
            cookieStr += `; secure`;
          }
          document.cookie = cookieStr;
        }
      });
    },
  };
}

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
    expireBrowserCookie(name, hostname);
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
