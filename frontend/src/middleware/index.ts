import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerClient } from "../lib/auth/supabase-ssr";
import { clearAllAuthCookies } from "../lib/auth/cookie-utils";
import { ApiErrors, handleApiError } from "../lib/errors/api-error";
import { getUserSession } from "../lib/auth/session-utils";
import { RedirectManager } from "../lib/auth/redirect-manager";
import type { SessionInfo } from "../types";
import { StructuredLogger } from "../lib/utils/logger";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  const traceId = context.request.headers.get("X-Trace-Id") || crypto.randomUUID();
  context.locals.trace_id = traceId;

  let logger = new StructuredLogger({ trace_id: traceId });
  context.locals.logger = logger;

  logger.info(`Request received`, { path: url.pathname });

  const supabase = createSupabaseServerClient(context.request, context.cookies);
  context.locals.supabase = supabase;

  try {
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

    if (error && error.code === "refresh_token_not_found") {
      logger.error("Invalid refresh token detected");

      clearAllAuthCookies(context.request, context.cookies);

      return context.redirect("/login");
    }

    context.locals.user = user || null;
    if (user) {
      logger = logger.with({ username: user.email || user.id });
      context.locals.logger = logger;
      logger.info("Middleware: User authenticated", { userId: user.id });
    } else {
      logger.debug("Middleware: No authenticated user");
    }

    let sessionInfo: SessionInfo | null = null;
    let token: string | null = null;

    if (user) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      token = session?.access_token || null;

      if (token) {
        logger.debug("Middleware: Access token obtained, fetching session info...");
        sessionInfo = await getUserSession(token);
        logger.debug("Middleware: Session info received", { sessionInfo });

        context.locals.sessionInfo = sessionInfo;
        context.locals.accessToken = token;
      } else {
        logger.warn("Middleware: No access token available");
      }
    }

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

        const targetUrl = new URL(redirectTo, url.origin);
        url.searchParams.forEach((val, key) => {
          if (!targetUrl.searchParams.has(key)) {
            targetUrl.searchParams.set(key, val);
          }
        });

        return context.redirect(targetUrl.pathname + targetUrl.search);
      }
    }

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
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));

    if (context.request.url.includes("/api/")) {
      context.locals.logger?.error("API Route Error", { name: err.name, error: err.message });
      return handleApiError(error);
    }

    context.locals.logger?.error("Middleware error", {
      name: err.name,
      error: err.message,
      stack: err.stack,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
});
