import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookieSetOptions, AstroCookies } from "astro";
import {
  AUTH_COOKIE_NAME,
  CHUNKED_COOKIE_REGEX,
  getCookieNamesToDelete,
  isCookieExpired,
  pruneCookieList,
} from "./cookie-utils";

/**
 * Creates cookie handlers for the Supabase SSR client with bilateral pruning.
 * Reads parsed cookies from the incoming request and writes updates back to Astro cookies.
 *
 * @param request - Incoming HTTP request containing Cookie headers
 * @param cookies - Astro's cookie handling interface
 */
export function createCookieMethods(request: Request, cookies: AstroCookies) {
  return {
    getAll() {
      return pruneCookieList(parseCookieHeader(request.headers.get("Cookie") ?? ""));
    },
    setAll(cookiesToSet: Array<{ name: string; value: string; options?: AstroCookieSetOptions }>) {
      const isWritingChunked = cookiesToSet.some(
        (c) =>
          CHUNKED_COOKIE_REGEX.test(c.name) &&
          Boolean(c.value) &&
          !isCookieExpired(c.value, c.options)
      );
      const isWritingBase =
        !isWritingChunked &&
        cookiesToSet.some(
          (c) =>
            c.name === AUTH_COOKIE_NAME && Boolean(c.value) && !isCookieExpired(c.value, c.options)
        );

      if (isWritingChunked) {
        cookies.delete(AUTH_COOKIE_NAME, { path: "/" });
      }

      if (isWritingBase) {
        const chunkNames = getCookieNamesToDelete(request.headers.get("Cookie"), {
          chunkedOnly: true,
        });
        for (const name of chunkNames) {
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

        if (isCookieExpired(value, options)) {
          cookies.delete(name, {
            path: options?.path ?? "/",
            ...(options?.domain ? { domain: options.domain } : {}),
          });
        } else {
          cookies.set(name, value, {
            ...options,
            path: options?.path ?? "/",
            sameSite: (options?.sameSite as "lax" | "strict" | "none") ?? "lax",
          });
        }
      });
    },
  };
}

/**
 * Creates a request-scoped Supabase client for SSR.
 * Ensures proper session isolation in server-side rendering.
 *
 * @param request - The incoming HTTP request
 * @param cookies - Astro's cookie handling interface
 * @param env - Optional runtime environment variables override
 * @returns Supabase client configured for SSR with proper cookie handling
 */
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies,
  env?: {
    PUBLIC_SUPABASE_URL?: string;
    PUBLIC_SUPABASE_ANON_KEY?: string;
  }
) {
  const supabaseUrl =
    env?.PUBLIC_SUPABASE_URL ||
    (import.meta.env.SSR && typeof process !== "undefined" && process.env.INTERNAL_SUPABASE_URL
      ? process.env.INTERNAL_SUPABASE_URL
      : import.meta.env.PUBLIC_SUPABASE_URL);

  const anonKey = env?.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  return createServerClient(supabaseUrl, anonKey, {
    cookieOptions: {
      name: AUTH_COOKIE_NAME,
    },
    cookies: createCookieMethods(request, cookies),
  });
}
