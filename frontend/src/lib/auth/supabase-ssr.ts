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
        getAll() {
          return parseCookieHeader(request.headers.get('Cookie') ?? '');
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookies.set(name, value, options);
          });
        },
      },
    }
  );
}

// Helper to parse cookie string into array of objects for Supabase
function parseCookieHeader(cookieHeader: string) {
  if (!cookieHeader) return [];
  const list: { name: string; value: string }[] = [];
  cookieHeader.split(';').forEach((cookie) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    if (!value) return;
    list.push({ name, value });
  });
  return list;
}
