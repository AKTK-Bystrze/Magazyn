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
import { refreshUserSession } from "@/lib/auth/session-refresh";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";
import { ApiErrors, handleApiError } from "@/lib/errors/api-error";
import { StructuredLogger } from "@/lib/utils/logger";

function unavailableResponse(isApi: boolean, message: string): Response {
  if (isApi) throw ApiErrors.serviceUnavailable(message);
  return new Response(message, {
    status: 503,
    headers: {
      "Retry-After": "5",
      "Cache-Control": "private, no-cache, no-store, must-revalidate, max-age=0",
      Pragma: "no-cache",
    },
  });
}

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
      // Proactive server-side token refresh (60s before expiry or already expired)
      if (Date.now() / 1000 >= session.expiresAt - 60) {
        logger.info("Access token near expiry, refreshing server-side", {
          userId: session.userId,
        });

        const supabase = createClient(
          process.env.INTERNAL_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL,
          process.env.PUBLIC_SUPABASE_ANON_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          }
        );

        const refreshResult = await refreshUserSession(session, supabase);

        if (!refreshResult.success) {
          logger.warn(
            refreshResult.isRevoked
              ? "Refresh token expired or revoked, clearing session"
              : "Session refresh transient error",
            { error: refreshResult.error }
          );

          if (refreshResult.isRevoked) {
            clearAllCookies(context.request, context.cookies);
            session = null;
          } else if (Date.now() / 1000 >= session.expiresAt) {
            // Access token has expired and refresh encountered a transient error.
            // Do not wipe cookies (preserve 30-day session), but do not use expired JWT.
            return unavailableResponse(
              url.pathname.startsWith("/api/"),
              "Usługa logowania jest tymczasowo niedostępna. Proszę odświeżyć stronę za chwilę."
            );
          }
        } else if (refreshResult.session) {
          session = refreshResult.session;
          const newCookieValue = await encryptSession(session);
          context.cookies.set(SESSION_COOKIE, newCookieValue, SESSION_COOKIE_OPTIONS);
          logger.info("Session refreshed and cookie rewritten");
        }
      }
    }

    if (session) {
      context.locals.accessToken = session.accessToken;

      const fetchResult = await getUserSession(session.accessToken);

      if (fetchResult.status === "ok") {
        const sessionInfo = fetchResult.sessionInfo;
        context.locals.sessionInfo = sessionInfo;
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
      } else if (fetchResult.status === "unauthorized") {
        logger.warn("User session unauthorized, clearing auth state", {
          userId: session.userId,
        });
        clearAllCookies(context.request, context.cookies);
        context.locals.user = null;
        context.locals.sessionInfo = null;
        context.locals.accessToken = null;
      } else {
        // Backend service unavailable (5xx, timeout, network error).
        // Preserves cookies so user is not logged out during transient blips.
        logger.error("Backend session validation unavailable", {
          userId: session.userId,
          error: fetchResult.error,
        });
        return unavailableResponse(
          url.pathname.startsWith("/api/"),
          "Serwer jest chwilowo niedostępny. Proszę odświeżyć stronę za chwilę."
        );
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
