import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";
import { ApiErrors, handleApiError } from "../lib/errors/api-error";
import { getDefaultRouteForUser } from "../lib/auth/role-utils";
import { getUserSession } from "../lib/auth/session-utils";
import type { SessionInfo } from "../types";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const cookieHeader = context.request.headers.get('cookie');
  const hasAuthCookie = cookieHeader?.includes('magazyn-auth-token');

  // Debug: Log every request
  if (!url.pathname.startsWith('/api/logger')) {
    console.log(`\n📍 [${url.pathname}] Request received. Cookie present: ${hasAuthCookie}`);
  }

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
      const authCookie = context.cookies.get("magazyn-auth-token");

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

    const url = new URL(context.request.url);

    // Define public routes that don't require authentication
    const publicRoutes = ["/login"];
    const isPublicRoute = publicRoutes.some((route) => url.pathname === route);
    const isAuthApiRoute = url.pathname.startsWith("/api/auth");
    const isAccountDisabledRoute = url.pathname === "/account-disabled";

    // 2. Fetch user session info if authenticated (to check isEnabled status)
    let sessionInfo: SessionInfo | null = null;
    if (context.locals.user && token) {
      sessionInfo = await getUserSession(token);
      // Store sessionInfo in locals for pages to access
      context.locals.sessionInfo = sessionInfo;
    }

    // 3. Check if user is disabled and redirect to account-disabled page
    // Allow access to account-disabled page itself and login page
    if (
      context.locals.user &&
      sessionInfo &&
      !sessionInfo.isEnabled &&
      !isAccountDisabledRoute &&
      !isPublicRoute
    ) {
      console.log("🔄 Redirecting disabled user to /account-disabled");
      return Response.redirect(new URL("/account-disabled", url.origin).toString(), 302);
    }

    // 4. Redirect enabled users away from account-disabled page
    if (isAccountDisabledRoute && sessionInfo?.isEnabled) {
      console.log("🔄 Redirecting enabled user away from /account-disabled");
      const defaultRoute = getDefaultRouteForUser(context.locals.user, sessionInfo);
      return Response.redirect(new URL(defaultRoute, url.origin).toString(), 302);
    }

    // 5. Protect API Routes
    // Require authentication for all /api endpoints except auth initialization and logger
    const isLoggerRoute = url.pathname === "/api/logger";

    if (url.pathname.startsWith("/api/") && !isAuthApiRoute && !isLoggerRoute) {
      if (!context.locals.user) {
        // Debug: Log cookies to see why auth failed
        console.log('🔒 Middleware: Access denied to API route:', url.pathname);
        throw ApiErrors.unauthorized("Authentication required");
      }

      // Block disabled users from API access
      if (sessionInfo && !sessionInfo.isEnabled) {
        throw ApiErrors.forbidden("Account is disabled. Please contact an administrator.");
      }
    }

    // 6. Protect Page Routes
    // Redirect unauthenticated users to login page for all protected routes
    if (!isPublicRoute && !isAccountDisabledRoute && !url.pathname.startsWith("/api/")) {
      if (!context.locals.user) {
        // Redirect to login page, preserving the original URL as a redirect parameter
        console.log("🔄 Redirecting unauthenticated user to /login from:", url.pathname);
        const redirectUrl = new URL("/login", url.origin);
        redirectUrl.searchParams.set("redirect", url.pathname);
        return Response.redirect(redirectUrl.toString(), 302);
      }
    }

    // 7. Role-based redirect for root path
    // Redirect authenticated users from root to their role-appropriate landing page
    if (url.pathname === "/" && context.locals.user) {
      console.log("🔄 Redirecting from root to role-based page");
      const defaultRoute = getDefaultRouteForUser(context.locals.user, sessionInfo);
      console.log(`calculated default route is ${defaultRoute}`)
      return Response.redirect(new URL(defaultRoute, url.origin).toString(), 302);
    }

    // 8. Redirect authenticated users away from login page
    if (url.pathname === "/login" && context.locals.user) {
      // Check if there's a redirect parameter
      const redirect = url.searchParams.get("redirect");

      console.log("🔄 Redirecting authenticated user from /login, redirect param:", redirect, "sessionInfo:", sessionInfo);
      if (redirect && redirect !== "/login" && redirect !== "/") {
        // If there's a specific redirect, use it
        console.log(`redirecting to ${redirect}`)
        return Response.redirect(new URL(redirect, url.origin).toString(), 302);
      } else {
        // Otherwise, redirect to role-based default page
        const defaultRoute = getDefaultRouteForUser(context.locals.user, sessionInfo);
        console.log(`redirecting to default route ${defaultRoute}`)
        return Response.redirect(new URL(defaultRoute, url.origin).toString(), 302);
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
