import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserSession } from '@/lib/auth/session-utils';
import { ROUTES } from '@/lib/config/routes';
import { RedirectManager } from '@/lib/auth/redirect-manager';
import {
  setAuthCookie,
  removeAuthCookie,
  waitForCookieAndRedirect,
  AUTH_COOKIE_NAME
} from '@/lib/auth/cookie-utils';

export const AuthListener: React.FC = () => {
  // Use React state instead of global variable for redirect tracking
  const [isRedirectInProgress, setIsRedirectInProgress] = useState(false);

  useEffect(() => {
    const checkHashForToken = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // CRITICAL: Set redirect flag IMMEDIATELY to prevent auth event handler from racing
        setIsRedirectInProgress(true);

        const hashParams = new URLSearchParams(hash.substring(1));
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');

        if (access_token && refresh_token) {
          try {
            // Clean hash FIRST to prevent re-processing
            window.history.replaceState(null, '', window.location.pathname + window.location.search);

            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });

            if (error) {
              console.error('❌ Session error:', error.message);
              setIsRedirectInProgress(false);
              window.location.href = ROUTES.PUBLIC.LOGIN;
              return;
            }

            if (data.session) {
              const sessionInfo = await getUserSession(data.session.access_token);

              if (!sessionInfo) {
                console.error('❌ Failed to fetch session info');
                setIsRedirectInProgress(false);
                window.location.href = ROUTES.PUBLIC.LOGIN;
                return;
              }

              // Use RedirectManager for consistent redirect logic
              const urlParams = new URLSearchParams(window.location.search);
              const redirectParam = urlParams.get('redirect');

              const redirectTo = RedirectManager.getRedirectForAuthState(
                data.session.user,
                sessionInfo,
                window.location.pathname,
                redirectParam,
                window.location.origin
              );

              if (redirectTo) {
                const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
                const targetPath = redirectTo.replace(/\/$/, '') || '/';

                if (currentPath !== targetPath) {
                  // Check for redirect loops
                  if (!RedirectManager.canRedirect(currentPath, redirectTo)) {
                    console.error('🚨 Redirect loop detected', { from: currentPath, to: redirectTo });
                    setIsRedirectInProgress(false);
                    return;
                  }

                  RedirectManager.recordRedirect(currentPath, redirectTo);
                  console.log(`🔗 Redirect: ${currentPath} → ${redirectTo}`);
                  await waitForCookieAndRedirect(data.session.access_token, redirectTo);
                }
              }
            }
          } catch (err) {
            console.error('❌ Exception:', err);
            setIsRedirectInProgress(false);
            window.location.href = ROUTES.PUBLIC.LOGIN;
          }
        } else {
          // No valid tokens, reset flag
          setIsRedirectInProgress(false);
        }
      }
    };

    checkHashForToken();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Sync cookie using centralized utility
      if (session?.access_token) {
        setAuthCookie(session.access_token);
      } else if (event === 'SIGNED_OUT') {
        removeAuthCookie();
      }

      if (event === 'SIGNED_IN' && session) {
        // Skip if hash present (hash handler processes) or redirect in progress
        if (window.location.hash.includes('access_token')) {
          console.log('⏸️ Skipping - hash handler will process');
          return;
        }

        if (isRedirectInProgress) {
          console.log('⏸️ Skipping - redirect in progress');
          return;
        }

        const sessionInfo = await getUserSession(session.access_token);
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');

        // Use RedirectManager for consistent redirect logic
        const redirectTo = RedirectManager.getRedirectForAuthState(
          session.user,
          sessionInfo,
          window.location.pathname,
          redirectParam,
          window.location.origin
        );

        if (redirectTo) {
          const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
          const targetPath = redirectTo.replace(/\/$/, '') || '/';

          if (currentPath !== targetPath) {
            // Check for redirect loops
            if (!RedirectManager.canRedirect(currentPath, redirectTo)) {
              console.error('🚨 Redirect loop detected', { from: currentPath, to: redirectTo });
              return;
            }

            RedirectManager.recordRedirect(currentPath, redirectTo);
            console.log(`🔔 Redirect: ${currentPath} → ${redirectTo}`);
            await waitForCookieAndRedirect(session.access_token, redirectTo);
          }
        }
      } else if (session && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, [isRedirectInProgress]); // Add dependency

  return null;
};
