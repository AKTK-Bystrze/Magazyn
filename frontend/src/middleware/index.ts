import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";
import { ApiErrors, handleApiError } from "../lib/errors/api-error";
import { getUserSession } from "../lib/auth/session-utils";
import { ROUTES } from "../lib/config/routes";
import { RedirectManager } from "../lib/auth/redirect-manager";
import { AUTH_COOKIE_NAME } from "../lib/auth/cookie-utils";
import type { SessionInfo } from "../types";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const cookieHeader = context.request.headers.get('cookie');
  const hasAuthCookie = cookieHeader?.includes(AUTH_COOKIE_NAME);

  console.log(`\n📍 [${url.pathname}] Request received. Cookie present: ${hasAuthCookie}`);

  context.locals.supabase = supabaseClient;

  try {
    // 1. Get session from Supabase
    // Note: In a real SSR scenario, we should pass request cookies to Supabase
    // But since we are using a singleton client here, it may strictly rely on 
    // Authorization header or standard client-side cookie behavior for subsequent calls.
    // For robust SSR auth, Supabase helpers for Astro should be used.
    // Here we perform a best-effort check.
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    context.locals.user = session?.user || null;

    // Fallback: Check for manual auth cookie if session is missing
    let token = session?.access_token;

    if (!context.locals.user) {
      const authCookie = context.cookies.get(AUTH_COOKIE_NAME);

      if (authCookie?.value) {
        const { data: { user }, error } = await supabaseClient.auth.getUser(authCookie.value);

        if (error) {
          console.error('❌ Middleware: Failed to validate cookie token:', error.message);
        }

        if (user && !error) {
          console.log('✅ Middleware: Cookie token valid for user:', user.email);
          context.locals.user = user;
          token = authCookie.value;
        } else {
          console.log('❌ Middleware: User is null despite no error? User:', user);
        }
      } else {
        console.log('⚠️ Middleware: No auth cookie found');
      }
    } else {
      console.log('✅ Middleware: Session found via standard Supabase method');
    }

    // Define route checks using centralized route constants
    const isPublicRoute = url.pathname === ROUTES.PUBLIC.LOGIN;
    const isAuthApiRoute = url.pathname.startsWith("/api/auth");
    const isAccountDisabledRoute = url.pathname === ROUTES.PROTECTED.ACCOUNT_DISABLED;

    // 2. Fetch user session info if authenticated (to check isEnabled status)
    let sessionInfo: SessionInfo | null = null;
    if (context.locals.user && token) {
      sessionInfo = await getUserSession(token);
      // Store sessionInfo in locals for pages to access
      context.locals.sessionInfo = sessionInfo;
    }

    // 3. Unified Redirect Logic - Single Source of Truth
    // Use RedirectManager instead of duplicated redirect logic
    const redirectParam = url.searchParams.get("redirect");
    const redirectTo = RedirectManager.getRedirectForAuthState(
      context.locals.user,
      sessionInfo,
      url.pathname,
      redirectParam,
      url.origin
    );

    if (redirectTo) {
      // Check for redirect loops before redirecting
      if (!RedirectManager.canRedirect(url.pathname, redirectTo)) {
        console.error('🚨 Redirect loop prevented:', { from: url.pathname, to: redirectTo });
        // Return error page instead of looping
        return new Response('Redirect loop detected', { status: 500 });
      }

      RedirectManager.recordRedirect(url.pathname, redirectTo);
      console.log(`🔄 Redirecting: ${url.pathname} → ${redirectTo}`);
      return Response.redirect(new URL(redirectTo, url.origin).toString(), 302);
    }

    // 4. Protect API Routes
    // Require authentication for all /api endpoints except auth initialization and logger

    if (url.pathname.startsWith("/api/") && !isAuthApiRoute) {
      if (!context.locals.user) {
        console.log('🔒 Middleware: Access denied to API route:', url.pathname);
        throw ApiErrors.unauthorized("Authentication required");
      }

      // Block disabled users from API access
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
