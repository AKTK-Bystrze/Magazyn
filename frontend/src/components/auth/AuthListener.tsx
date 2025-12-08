import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getDefaultRouteForUser } from '@/lib/auth/role-utils';
import { getUserSession } from '@/lib/auth/session-utils';

const logToServer = (level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) => {
  if (level === 'ERROR') console.error(message, data);
  else console.log(message, data);

  try {
    fetch('/api/logger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, data }),
      keepalive: true,
    }).catch(() => { });
  } catch (e) { }
};

// Global flag to prevent multiple simultaneous redirects
let isRedirectInProgress = false;

const waitForCookieAndRedirect = async (accessToken: string, redirectTo: string): Promise<boolean> => {
  if (isRedirectInProgress) {
    logToServer('INFO', '⏸️ Redirect blocked - already in progress');
    return false;
  }

  isRedirectInProgress = true;
  const cookieName = 'magazyn-auth-token';
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${cookieName}=${accessToken}; path=/; max-age=${maxAge}; SameSite=Lax`;

  await new Promise(resolve => setTimeout(resolve, 100));

  if (!document.cookie.includes(cookieName)) {
    logToServer('WARN', '⚠️ Cookie not set, waiting longer...');
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  logToServer('INFO', `🔄 Redirecting to: ${redirectTo}`);
  window.location.replace(redirectTo);
  return true;
};

export const AuthListener: React.FC = () => {
  useEffect(() => {
    const checkHashForToken = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes('access_token')) {
        // CRITICAL: Set redirect flag IMMEDIATELY to prevent auth event handler from racing
        isRedirectInProgress = true;
        logToServer('INFO', '🔗 Processing magic link token...');

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
              logToServer('ERROR', '❌ Session error:', error.message);
              isRedirectInProgress = false;
              window.location.href = '/login';
              return;
            }

            if (data.session) {
              const sessionInfo = await getUserSession(data.session.access_token);

              if (!sessionInfo) {
                logToServer('ERROR', '❌ Failed to fetch session info');
                isRedirectInProgress = false;
                window.location.href = '/login';
                return;
              }

              const urlParams = new URLSearchParams(window.location.search);
              const redirectParam = urlParams.get('redirect');

              let redirectTo: string;
              if (redirectParam && redirectParam !== '/login' && redirectParam !== '/') {
                redirectTo = !sessionInfo.isEnabled ? '/account-disabled' : redirectParam;
              } else {
                redirectTo = getDefaultRouteForUser(data.session.user, sessionInfo);
              }

              const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
              const targetPath = redirectTo.replace(/\/$/, '') || '/';

              if (currentPath !== targetPath) {
                logToServer('INFO', `🔗 Redirect: ${currentPath} → ${redirectTo}`);
                await waitForCookieAndRedirect(data.session.access_token, redirectTo);
              }
            }
          } catch (err) {
            logToServer('ERROR', '❌ Exception:', err);
            isRedirectInProgress = false;
            window.location.href = '/login';
          }
        } else {
          // No valid tokens, reset flag
          isRedirectInProgress = false;
        }
      }
    };

    checkHashForToken();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Sync cookie
      if (session?.access_token) {
        const maxAge = 60 * 60 * 24 * 365;
        document.cookie = `magazyn-auth-token=${session.access_token}; path=/; max-age=${maxAge}; SameSite=Lax`;
      } else if (event === 'SIGNED_OUT') {
        document.cookie = 'magazyn-auth-token=; path=/; max-age=0; SameSite=Lax';
      }

      if (event === 'SIGNED_IN' && session) {
        // Skip if hash present (hash handler processes) or redirect in progress
        if (window.location.hash.includes('access_token')) {
          logToServer('INFO', '⏸️ Skipping - hash handler will process');
          return;
        }

        if (isRedirectInProgress) {
          logToServer('INFO', '⏸️ Skipping - redirect in progress');
          return;
        }

        const sessionInfo = await getUserSession(session.access_token);
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');

        let redirectTo: string;
        if (redirectParam && redirectParam !== '/login' && redirectParam !== '/') {
          redirectTo = sessionInfo && !sessionInfo.isEnabled ? '/account-disabled' : redirectParam;
        } else {
          redirectTo = getDefaultRouteForUser(session.user, sessionInfo);
        }

        const currentPath = window.location.pathname.replace(/\/$/, '') || '/';
        const targetPath = redirectTo.replace(/\/$/, '') || '/';

        if (currentPath !== targetPath) {
          logToServer('INFO', `🔔 Redirect: ${currentPath} → ${redirectTo}`);
          await waitForCookieAndRedirect(session.access_token, redirectTo);
        }
      } else if (session && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
};
