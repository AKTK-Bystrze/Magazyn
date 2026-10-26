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
      return parseCookieHeader(request.headers.get("Cookie") ?? "").map(({ name, value }) => ({
        name,
        value: value ?? "",
      }));
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
        for (let i = 0; i <= 9; i++) {
          cookies.delete(`${AUTH_COOKIE_NAME}.${i}`, { path: "/" });
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
