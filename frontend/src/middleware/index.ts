// frontend/src/middleware/index.ts
import { defineMiddleware } from "astro:middleware";
import { createClient } from "@supabase/supabase-js";
import {
  decryptSession,
  encryptSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
} from "@/lib/auth/session-store";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";
import { ApiErrors, handleApiError } from "@/lib/errors/api-error";
import { StructuredLogger } from "@/lib/utils/logger";

export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const traceId = context.request.headers.get("X-Trace-Id") || crypto.randomUUID();
  context.locals.trace_id = traceId;

  const logger = new StructuredLogger({ trace_id: traceId });
  context.locals.logger = logger;

  logger.info("Request received", { path: url.pathname });

  try {
    const rawCookie = context.cookies.get(SESSION_COOKIE)?.value ?? null;
    let session = rawCookie ? await decryptSession(rawCookie) : null;

    if (session) {
      // Proactive server-side token refresh (60s before expiry)
      if (Date.now() / 1000 >= session.expiresAt - 60) {
        logger.info("Access token near expiry, refreshing server-side");

        const supabase = createClient(
          process.env.INTERNAL_SUPABASE_URL || import.meta.env.PUBLIC_SUPABASE_URL,
          process.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY
        );

        const { data, error } = await supabase.auth.refreshSession({
          refresh_token: session.refreshToken,
        });

        if (error || !data.session) {
          // A failed refresh is only a logged-out user when the token was
          // actually revoked. Transient errors (timeouts, 5xx) must not log
          // the user out — keep the current session for this request.
          const authError = error as
            { code?: string; message?: string; status?: number } | null | undefined;
          const isRevoked =
            Boolean(error) &&
            ((authError?.status !== undefined &&
              authError.status >= 400 &&
              authError.status < 500) ||
              /revoked|expired|not_found|invalid/i.test(
                `${authError?.code ?? ""} ${authError?.message ?? ""}`
              ));

          if (isRevoked) {
            logger.warn("Refresh token expired or revoked, clearing session", {
              error: error?.message,
            });
            context.cookies.delete(SESSION_COOKIE, { path: "/" });
            session = null;
          } else {
            logger.warn("Session refresh failed, keeping existing session", {
              error: error?.message,
            });
          }
        } else {
          session = {
            ...session,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
            expiresAt: data.session.expires_at ?? session.expiresAt,
          };

          // Rewrite cookie with new tokens
          context.cookies.set(
            SESSION_COOKIE,
            await encryptSession(session),
            SESSION_COOKIE_OPTIONS
          );

          logger.info("Session refreshed and cookie rewritten");
        }
      }
    }

    if (session) {
      context.locals.accessToken = session.accessToken;

      const sessionInfo = await getUserSession(session.accessToken);
      context.locals.sessionInfo = sessionInfo;

      // A failed session-info fetch is a temporary backend blip, not a logout.
      // Keep the user signed in; the email falls back to empty until the next
      // successful fetch.
      context.locals.user = {
        id: session.userId,
        email: sessionInfo?.email ?? "",
      };

      if (sessionInfo) {
        logger.info("User authenticated", {
          userId: session.userId,
          role: sessionInfo.role,
        });
      }
    } else {
      context.locals.user = null;
      context.locals.sessionInfo = null;
      context.locals.accessToken = null;
      logger.debug("No authenticated session");
    }

    // Static asset passthrough
    const isStaticAsset =
      /\.(css|js|mjs|map|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|mp4|webm)$/i.test(
        url.pathname
      );

    // Page route guard
    if (!url.pathname.startsWith("/api/") && !isStaticAsset) {
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

    return next();
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    if (context.request.url.includes("/api/")) return handleApiError(error);
    context.locals.logger?.error("Middleware error", {
      name: err.name,
      error: err.message,
    });
    return new Response("Internal Server Error", { status: 500 });
  }
});
