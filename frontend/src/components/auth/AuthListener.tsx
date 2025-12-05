import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const AuthListener: React.FC = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      if (session) {
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
