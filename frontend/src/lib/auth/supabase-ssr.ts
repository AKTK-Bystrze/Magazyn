import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";

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
      name: "sb-magazyn-auth-token",
    },
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
    },
  });
}
