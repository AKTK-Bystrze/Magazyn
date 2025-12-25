import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';

/**
 * Creates a request-scoped Supabase client for SSR
 * 
 * This factory ensures proper session isolation in server-side rendering.
 * Each request gets its own client instance with request-specific cookies.
 * 
 * @param request - The incoming HTTP request
 * @param cookies - Astro's cookie handling interface
 * @returns Supabase client configured for SSR with proper cookie handling
 * 
 * @example
 * // In Astro middleware
 * const supabase = createSupabaseServerClient(context.request, context.cookies);
 * const { data: { user } } = await supabase.auth.getUser();
 */
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies
) {
  return createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key: string) {
          return cookies.get(key)?.value;
        },
        set(key: string, value: string, options: CookieOptions) {
          cookies.set(key, value, options);
        },
        remove(key: string, options: CookieOptions) {
          cookies.delete(key, options);
        },
      },
    }
  );
}
