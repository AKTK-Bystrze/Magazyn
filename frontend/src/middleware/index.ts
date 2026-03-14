import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/auth/supabase-ssr";
import { ApiErrors, handleApiError } from "../lib/errors/api-error";
import { getUserSession } from "../lib/auth/session-utils";
import { RedirectManager } from "../lib/auth/redirect-manager";
import type { SessionInfo } from "../types";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  console.log(`\n📍 [${url.pathname}] Request received`);

  // Create request-scoped Supabase client for proper SSR session isolation
  const supabase = createSupabaseServerClient(context.request, context.cookies);
  context.locals.supabase = supabase;

  try {
    // Diagnostics: Log cookie header before auth calls
    const cookieHeader = context.request.headers.get('Cookie');
    console.log('🍪 Cookie header length:', cookieHeader?.length || 0);
    const sbCookies = cookieHeader?.split('; ').filter(c => c.includes('sb-')) || [];
    console.log('🍪 Supabase cookies found:', sbCookies.length);

    // 1. Get user from Supabase using getUser() (recommended for SSR)
    // This validates the session server-side instead of relying on client-provided session
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      console.error('❌ Supabase getUser() error:', {
        code: error.code,
        message: error.message,
        status: error.status,
        name: error.name
      });
    }

    context.locals.user = user || null;

    // Handle invalid refresh token error - clear cookies and redirect gracefully
    if (error && (error.code === 'refresh_token_not_found' || error.message?.includes('refresh'))) {
      console.error('🧹 Invalid refresh token detected, clearing auth cookies');
      context.cookies.delete('sb-access-token', { path: '/' });
      context.cookies.delete('sb-refresh-token', { path: '/' });
      context.cookies.delete('sb-session-token', { path: '/' });
      
      return Response.redirect(new URL('/login', url.origin).toString(), 302);
    }

    if (user) {
      console.log('✅ Middleware: User authenticated:', user.id);
    } else {
      console.log('❌ Middleware: No authenticated user');
    }

    // 2. Fetch user session info if authenticated (to check isEnabled status)
    let sessionInfo: SessionInfo | null = null;
    let token: string | null = null;

    if (user) {
      // Get access token from session
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;

      if (token) {
        console.log('🔑 Middleware: Access token obtained, fetching session info...');
        sessionInfo = await getUserSession(token);
        console.log('📋 Middleware: Session info received:', sessionInfo);

        // Store sessionInfo and token in locals for pages and API routes to access
        context.locals.sessionInfo = sessionInfo;
        context.locals.accessToken = token;
      } else {
        console.warn('⚠️ Middleware: No access token available');
      }
    }

    // 3. Unified Redirect Logic
    // SKIP redirects for API routes - they should handle auth state via 401/403 or pass through
    // SKIP redirects for static assets (CSS, JS, images, fonts, etc.)
    const isStaticAsset = /\.(css|js|mjs|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|mp4|webm)$/i.test(url.pathname);

    if (!url.pathname.startsWith("/api/") && !isStaticAsset) {
      const redirectParam = url.searchParams.get("redirect");
      const redirectTo = RedirectManager.getRedirectForAuthState(
        context.locals.user,
        sessionInfo,
        url.pathname,
        redirectParam,
        url.origin
      );

      if (redirectTo) {
        console.log(`🔄 Redirecting: ${url.pathname} → ${redirectTo}`);
        console.log('📊 Request state:', {
          hasUser: !!user,
          hasSessionInfo: !!sessionInfo,
          hasToken: !!token,
          pathname: url.pathname
        });
        return Response.redirect(new URL(redirectTo, url.origin).toString(), 302);
      }
    }

    // 4. Protect API Routes
    // Require authentication for all /api endpoints except auth initialization and logger
    const isAuthApiRoute = url.pathname.startsWith("/api/auth");
    if (url.pathname.startsWith("/api/") && !isAuthApiRoute) {
      if (!context.locals.user) {
        console.log('🔒 Middleware: Access denied to API route:', url.pathname);
        throw ApiErrors.unauthorized("Authentication required");
      }

      if (sessionInfo && !sessionInfo.isEnabled) {
        throw ApiErrors.forbidden("Account is disabled. Please contact an administrator.");
      }
    }

    return next();

  } catch (error) {
    // Handle API errors specifically for API routes
    if (context.request.url.includes("/api/")) {
      return handleApiError(error);
    }
    // For page routes, we might want to redirect or let Astro handle it, 
    // but here we just rethrow or return error page if needed.
    // Since we only throw inside the /api/ check above, this catch block mostly catches API errors.
    console.error("Middleware error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});
