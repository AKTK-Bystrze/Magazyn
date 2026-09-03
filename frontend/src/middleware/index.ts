import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/auth/supabase-ssr";
import { ApiErrors, handleApiError } from "../lib/errors/api-error";
import { getUserSession } from "../lib/auth/session-utils";
import { RedirectManager } from "../lib/auth/redirect-manager";
import type { SessionInfo } from "../types";
import { StructuredLogger } from "../lib/utils/logger";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Initialize trace_id
  const traceId = context.request.headers.get("X-Trace-Id") || crypto.randomUUID();
  context.locals.trace_id = traceId;

  // Initialize logger
  let logger = new StructuredLogger({ trace_id: traceId });
  context.locals.logger = logger;

  logger.info(`Request received`, { path: url.pathname });

  // Create request-scoped Supabase client for proper SSR session isolation
  const supabase = createSupabaseServerClient(context.request, context.cookies);
  context.locals.supabase = supabase;

  try {
    // 1. Get user from Supabase using getUser() (recommended for SSR)
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.error("Supabase getUser() error", {
        code: error.code,
        message: error.message,
        status: error.status,
        name: error.name,
      });
    }

    // Handle invalid refresh token error - clear cookies and redirect gracefully
    if (error && error.code === "refresh_token_not_found") {
      logger.error("Invalid refresh token detected");
      context.cookies.delete("sb-access-token", { path: "/" });
      context.cookies.delete("sb-refresh-token", { path: "/" });
      context.cookies.delete("sb-session-token", { path: "/" });

      return context.redirect("/login");
    }

    context.locals.user = user || null;
    if (user) {
      // Update logger with username
      logger = logger.with({ username: user.email || user.id });
      context.locals.logger = logger;
      logger.info("Middleware: User authenticated", { userId: user.id });
    } else {
      logger.debug("Middleware: No authenticated user");
    }

    // 2. Fetch user session info if authenticated (to check isEnabled status)
    let sessionInfo: SessionInfo | null = null;
    let token: string | null = null;

    if (user) {
      // Get access token from session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      token = session?.access_token || null;

      if (token) {
        logger.debug("Middleware: Access token obtained, fetching session info...");
        sessionInfo = await getUserSession(token);
        logger.debug("Middleware: Session info received", { sessionInfo });

        // Store sessionInfo and token in locals for pages and API routes to access
        context.locals.sessionInfo = sessionInfo;
        context.locals.accessToken = token;
      } else {
        logger.warn("Middleware: No access token available");
      }
    }

    // 3. Unified Redirect Logic
    const isStaticAsset =
      /\.(css|js|mjs|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|mp4|webm)$/i.test(
        url.pathname
      );

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
        logger.info(`Redirecting request`, { from: url.pathname, to: redirectTo });
        logger.debug("Request state", {
          hasUser: !!user,
          hasSessionInfo: !!sessionInfo,
          hasToken: !!token,
          pathname: url.pathname,
        });
        return context.redirect(redirectTo);
      }
    }

    // 4. Protect API Routes
    const isAuthApiRoute = url.pathname.startsWith("/api/auth");
    if (url.pathname.startsWith("/api/") && !isAuthApiRoute) {
      if (!context.locals.user) {
        logger.warn("Middleware: Access denied to API route", { path: url.pathname });
        throw ApiErrors.unauthorized("Authentication required");
      }

      if (sessionInfo && !sessionInfo.isEnabled) {
        logger.warn("Middleware: Access denied for disabled account", { path: url.pathname });
        throw ApiErrors.forbidden("Account is disabled. Please contact an administrator.");
      }
    }

    return next();
  } catch (error: any) {
    // Handle API errors specifically for API routes
    if (context.request.url.includes("/api/")) {
      context.locals.logger?.error("API Route Error", { name: error.name, error: error.message });
      return handleApiError(error);
    }

    context.locals.logger?.error("Middleware error", {
      name: error.name,
      error: error.message,
      stack: error.stack,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
});
