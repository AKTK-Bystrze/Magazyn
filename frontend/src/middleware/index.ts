import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";
import { ApiErrors, handleApiError } from "../lib/errors/api-error";
import { getDefaultRouteForUser } from "../lib/auth/role-utils";

export const onRequest = defineMiddleware(async (context, next) => {
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

    const url = new URL(context.request.url);

    // Define public routes that don't require authentication
    const publicRoutes = ["/login"];
    const isPublicRoute = publicRoutes.some((route) => url.pathname === route);
    const isAuthApiRoute = url.pathname.startsWith("/api/auth");

    // 2. Protect API Routes
    // Require authentication for all /api endpoints except auth initialization
    if (url.pathname.startsWith("/api/") && !isAuthApiRoute) {
      if (!context.locals.user) {
        throw ApiErrors.unauthorized("Authentication required");
      }
    }

    // 3. Protect Page Routes
    // Redirect unauthenticated users to login page for all protected routes
    if (!isPublicRoute && !url.pathname.startsWith("/api/")) {
      if (!context.locals.user) {
        // Redirect to login page, preserving the original URL as a redirect parameter
        const redirectUrl = new URL("/login", url.origin);
        redirectUrl.searchParams.set("redirect", url.pathname);
        return Response.redirect(redirectUrl.toString(), 302);
      }
    }

    // 4. Role-based redirect for root path
    // Redirect authenticated users from root to their role-appropriate landing page
    if (url.pathname === "/" && context.locals.user) {
      const defaultRoute = getDefaultRouteForUser(context.locals.user);
      return Response.redirect(new URL(defaultRoute, url.origin).toString(), 302);
    }

    // 5. Redirect authenticated users away from login page
    if (url.pathname === "/login" && context.locals.user) {
      // Check if there's a redirect parameter
      const redirect = url.searchParams.get("redirect");

      if (redirect && redirect !== "/login" && redirect !== "/") {
        // If there's a specific redirect, use it
        return Response.redirect(new URL(redirect, url.origin).toString(), 302);
      } else {
        // Otherwise, redirect to role-based default page
        const defaultRoute = getDefaultRouteForUser(context.locals.user);
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
