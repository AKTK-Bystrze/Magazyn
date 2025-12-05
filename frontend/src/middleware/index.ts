import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";
import { ApiErrors, handleApiError } from "../lib/errors/api-error";

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

    // 2. Protect API Routes
    // Require authentication for all /api endpoints except auth initialization
    if (url.pathname.startsWith("/api/") && !url.pathname.startsWith("/api/auth")) {
      if (!context.locals.user) {
        throw ApiErrors.unauthorized("Authentication required");
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
