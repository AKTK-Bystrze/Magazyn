import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getUserSession } from "@/lib/auth/session-utils";
import { ROUTES } from "@/lib/config/routes";
import { RedirectManager } from "@/lib/auth/redirect-manager";
import { normalizePath } from "@/lib/auth/url-utils";
import { defaultLogger as logger } from "@/lib/utils/logger";

/**
 * Component that listens for Supabase auth state changes
 * Handles session management, redirects, and cookie synchronization
 * Must be placed at the root of the application (in Layout)
 */
export const AuthListener: React.FC = () => {
  const [isRedirectInProgress, setIsRedirectInProgress] = useState(false);

  useEffect(() => {
    const checkHashForToken = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        setIsRedirectInProgress(true);

        const hashParams = new URLSearchParams(hash.substring(1));
        const access_token = hashParams.get("access_token");
        const refresh_token = hashParams.get("refresh_token");

        if (access_token && refresh_token) {
          try {
            window.history.replaceState(
              null,
              "",
              window.location.pathname + window.location.search
            );

            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              logger.error("❌ Session error:", { error: error.message });
              setIsRedirectInProgress(false);
              window.location.href = ROUTES.PUBLIC.LOGIN;
              return;
            }

            if (data.session) {
              const sessionInfo = await getUserSession(data.session.access_token);

              if (!sessionInfo) {
                logger.error("❌ Failed to fetch session info");
                setIsRedirectInProgress(false);
                window.location.href = ROUTES.PUBLIC.LOGIN;
                return;
              }

              const urlParams = new URLSearchParams(window.location.search);
              const redirectParam = urlParams.get("redirect");

              const redirectTo = RedirectManager.getRedirectForAuthState(
                data.session.user,
                sessionInfo,
                window.location.pathname,
                redirectParam,
                window.location.origin
              );

              if (redirectTo) {
                if (normalizePath(window.location.pathname) !== normalizePath(redirectTo)) {
                  logger.info(`🔗 Redirect: ${window.location.pathname} → ${redirectTo}`);
                  window.location.replace(redirectTo);
                }
              }
            }
          } catch (err) {
            logger.error("❌ Exception:", { error: err });
            setIsRedirectInProgress(false);
            window.location.href = ROUTES.PUBLIC.LOGIN;
          }
        } else {
          setIsRedirectInProgress(false);
        }
      }
    };

    checkHashForToken();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "TOKEN_REFRESHED" && session) {
        logger.info("🔄 Token refreshed (cookies auto-updated)");
      }

      if (event === "TOKEN_REFRESHED" && !session) {
        logger.error("❌ Token refresh failed, logging out");
        await supabase.auth.signOut();
        window.location.href = ROUTES.PUBLIC.LOGIN;
        return;
      }

      if (event === "SIGNED_IN" && session) {
        if (window.location.hash.includes("access_token")) {
          logger.info("⏸️ Skipping - hash handler will process");
          return;
        }

        if (isRedirectInProgress) {
          logger.info("⏸️ Skipping - redirect in progress");
          return;
        }

        const sessionInfo = await getUserSession(session.access_token);
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get("redirect");

        const redirectTo = RedirectManager.getRedirectForAuthState(
          session.user,
          sessionInfo,
          window.location.pathname,
          redirectParam,
          window.location.origin
        );

        if (redirectTo) {
          const currentPath = window.location.pathname.replace(/\/$/, "") || "/";
          const targetPath = redirectTo.replace(/\/$/, "") || "/";

          if (currentPath !== targetPath) {
            logger.info(`🔔 Redirect: ${currentPath} → ${redirectTo}`);
            window.location.replace(redirectTo);
          }
        }
      } else if (session && window.location.hash.includes("access_token")) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, [isRedirectInProgress]); // Add dependency

  return null;
};
