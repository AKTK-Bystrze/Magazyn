// frontend/src/middleware/index.ts
import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import {
  decryptSession,
  encryptSession,
  clearAllCookies,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-store";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";
import { ApiErrors, handleApiError } from "@/lib/errors/api-error";
import { StructuredLogger } from "@/lib/utils/logger";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);

  // Static asset passthrough: skip logging and auth middleware overhead
  const isStaticAsset =
    /\.(css|js|mjs|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|mp4|webm)$/i.test(
      url.pathname
    );
  if (isStaticAsset) {
    return next();
  }

  const traceId = context.request.headers.get("X-Trace-Id") || crypto.randomUUID();
  context.locals.trace_id = traceId;

  let logger = new StructuredLogger({ trace_id: traceId });
  context.locals.logger = logger;

  logger.info("Request received", { path: url.pathname });

  try {
    const rawCookie = context.cookies.get(SESSION_COOKIE)?.value ?? null;
    let session = rawCookie ? await decryptSession(rawCookie) : null;

    if (session) {
      // Proactive server-side token refresh (60s before expiry)
      if (Date.now() / 1000 >= session.expiresAt - 60) {
        logger.info("Access token near expiry, refreshing server-side", {
          userId: session.userId,
        });

        const supabase = createClient(
          process.env.INTERNAL_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL,
          process.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY
        );

        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: session.refreshToken,
        });

        if (error || !data.session) {
          const authErr = error as { code?: string; message?: string; status?: number } | null;
          const isRevoked =
            Boolean(error) &&
            ((authErr?.status !== undefined && authErr.status >= 400 && authErr.status < 500) ||
              /revoked|expired|not_found|invalid/i.test(`${authErr?.code} ${authErr?.message}`));

          logger.warn(
            isRevoked
              ? "Refresh token expired or revoked, clearing session"
              : "Session refresh transient error",
            { error: error?.message }
          );

          if (isRevoked) {
            clearAllCookies(context.request, context.cookies);
            session = null;
          }
        } else {
          session = {
            userId: session.userId,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at ?? session.expiresAt,
          };
          const newCookieValue = await encryptSession(session);
          context.cookies.set(SESSION_COOKIE, newCookieValue, SESSION_COOKIE_OPTIONS);
          logger.info("Session refreshed and cookie rewritten");
        }
      }
    }

    if (session) {
      context.locals.accessToken = session.accessToken;

      const sessionInfo = await getUserSession(session.accessToken);
      context.locals.sessionInfo = sessionInfo;

      if (sessionInfo) {
        context.locals.user = {
          id: session.userId,
          email: sessionInfo.email ?? "",
        };

        logger = logger.with({
          username: sessionInfo.email || session.userId,
          userId: session.userId,
        });
        context.locals.logger = logger;

        logger.info("User authenticated", {
          userId: session.userId,
          role: sessionInfo.role,
        });
      } else {
        logger.warn("User session invalid or unreachable, clearing auth state", {
          userId: session.userId,
        });
        clearAllCookies(context.request, context.cookies);
        context.locals.user = null;
        context.locals.sessionInfo = null;
        context.locals.accessToken = null;
      }
    } else {
      context.locals.user = null;
      context.locals.sessionInfo = null;
      context.locals.accessToken = null;
      logger.debug("No authenticated session");
    }

    // Page route guard
    if (!url.pathname.startsWith("/api/")) {
      const redirectTo = RedirectManager.getRedirectForAuthState(
        context.locals.user,
        context.locals.sessionInfo,
        url.pathname,
        url.searchParams.get("redirect"),
        url.origin
      );
      if (redirectTo) {
        logger.info("Redirecting request", { from: url.pathname, to: redirectTo });
        return context.redirect(redirectTo);
      }
    }

    // API route auth enforcement
    const isAuthApiRoute = url.pathname.startsWith("/api/auth");
    if (url.pathname.startsWith("/api/") && !isAuthApiRoute) {
      if (!context.locals.user) {
        throw ApiErrors.unauthorized("Authentication required");
      }
      if (context.locals.sessionInfo && !context.locals.sessionInfo.isEnabled) {
        throw ApiErrors.forbidden("Account is disabled. Please contact an administrator.");
      }
    }

    const response = await next();
    if (!isStaticAsset && !url.pathname.startsWith("/_astro/")) {
      response.headers.set(
        "Cache-Control",
        "private, no-cache, no-store, must-revalidate, max-age=0"
      );
      response.headers.set("Pragma", "no-cache");
    }
    return response;
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (context.request.url.includes("/api/")) return handleApiError(error);
    context.locals.logger?.error("Middleware error", {
      name: err.name,
      error: err.message,
    });
    return new Response("Internal Server Error", {
      status: 500,
      headers: {
        "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  }
});
