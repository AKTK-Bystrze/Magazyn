import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getDefaultRouteForUser } from '@/lib/auth/role-utils';

export const AuthListener: React.FC = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event);

      if (event === 'SIGNED_IN' && session) {
        console.log('User signed in:', session.user.email);

        // Get the redirect parameter from URL if present
        const urlParams = new URLSearchParams(window.location.search);
        const redirectParam = urlParams.get('redirect');

        // Determine where to redirect the user
        let redirectTo: string;

        if (redirectParam && redirectParam !== '/login' && redirectParam !== '/') {
          // If there's a specific redirect parameter, use it
          redirectTo = redirectParam;
        } else {
          // Otherwise, use role-based default route
          redirectTo = getDefaultRouteForUser(session.user);
        }

        // Clean up URL hash if it contains the token
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }

        // Redirect to the appropriate page
        console.log('Redirecting to:', redirectTo);
        window.location.href = redirectTo;
      } else if (session) {
        console.log('Session active:', session.user.email);
        // Cleanse URL hash if it contains the token
        if (window.location.hash && window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
};
