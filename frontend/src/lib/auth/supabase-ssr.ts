import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookieSetOptions, AstroCookies } from "astro";

export const AUTH_COOKIE_NAME = "sb-magazyn-auth-token";
export const CHUNKED_COOKIE_REGEX = /^sb-magazyn-auth-token\.\d+$/;

/**
 * Creates cookie handlers for the Supabase SSR client with bilateral pruning.
 *
 * @param request - The incoming HTTP request
 * @param cookies - Astro's cookie handling interface
 * @returns An object containing getAll and setAll cookie methods
 */
export function createCookieMethods(request: Request, cookies: AstroCookies) {
  return {
    getAll() {
      const parsed = parseCookieHeader(request.headers.get("Cookie") ?? "").map(
        ({ name, value }) => ({
          name,
          value: value ?? "",
        })
      );

      // Bilateral read-side pruning:
      // If chunked cookies exist, suppress unchunked base cookie so `@supabase/ssr`
      // combineChunks() is forced to reconstruct the chunks rather than early-exiting on a stale base token.
      const hasChunks = parsed.some((c) => CHUNKED_COOKIE_REGEX.test(c.name) && Boolean(c.value));

      if (hasChunks) {
        return parsed.filter((c) => c.name !== AUTH_COOKIE_NAME);
      }

      return parsed;
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options?: AstroCookieSetOptions }>) {
      const isWritingChunked = cookiesToSet.some(
        (c) => CHUNKED_COOKIE_REGEX.test(c.name) && Boolean(c.value) && c.options?.maxAge !== 0
      );

      const isWritingBase =
        !isWritingChunked &&
        cookiesToSet.some(
          (c) => c.name === AUTH_COOKIE_NAME && Boolean(c.value) && c.options?.maxAge !== 0
        );

      if (isWritingChunked) {
        cookies.delete(AUTH_COOKIE_NAME, { path: "/" });
      }

      if (isWritingBase) {
        const chunkNamesToDelete = new Set<string>();
        for (let i = 0; i <= 9; i++) {
          chunkNamesToDelete.add(`${AUTH_COOKIE_NAME}.${i}`);
        }

        const rawCookieHeader = request.headers.get("Cookie") ?? "";
        if (rawCookieHeader) {
          const incomingCookieNames = rawCookieHeader.split(";").map((c) => c.split("=")[0].trim());
          for (const name of incomingCookieNames) {
            if (CHUNKED_COOKIE_REGEX.test(name)) {
              chunkNamesToDelete.add(name);
            }
          }
        }

        for (const name of chunkNamesToDelete) {
          cookies.delete(name, { path: "/" });
        }
      }

      cookiesToSet.forEach(({ name, value, options }) => {
        if (isWritingChunked && name === AUTH_COOKIE_NAME) {
          cookies.delete(name, { path: options?.path ?? "/" });
          return;
        }

        if (isWritingBase && CHUNKED_COOKIE_REGEX.test(name)) {
          cookies.delete(name, { path: options?.path ?? "/" });
          return;
        }

        if (!value || options?.maxAge === 0) {
          cookies.delete(name, {
            path: options?.path ?? "/",
            ...(options?.domain ? { domain: options.domain } : {}),
          });
        } else {
          cookies.set(name, value, {
            ...options,
            path: options?.path ?? "/",
            sameSite: "lax",
          });
        }
      });
    },
  };
}

/**
 * Creates a request-scoped Supabase client for SSR
 *
 * This factory ensures proper session isolation in server-side rendering.
 * Each request gets its own client instance with request-specific cookies.
 *
 * @param request - The incoming HTTP request
 * @param cookies - Astro's cookie handling interface
 * @returns Supabase client configured for SSR with proper cookie handling
 */
export function createSupabaseServerClient(request: Request, cookies: AstroCookies) {
  const supabaseUrl =
    import.meta.env.SSR && typeof process !== "undefined" && process.env.INTERNAL_SUPABASE_URL
      ? process.env.INTERNAL_SUPABASE_URL
      : import.meta.env.PUBLIC_SUPABASE_URL;

  return createServerClient(supabaseUrl, import.meta.env.PUBLIC_SUPABASE_ANON_KEY, {
    cookieOptions: {
      name: AUTH_COOKIE_NAME,
    },
    cookies: createCookieMethods(request, cookies),
  });
}
