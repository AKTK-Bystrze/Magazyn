import { vi } from 'vitest';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

export type AuthCallback = (event: AuthChangeEvent, session: Session | null) => void;

export const createMockSupabaseClient = () => {
  let authCallback: AuthCallback | null = null;

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      setSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn((callback: AuthCallback) => {
        authCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        };
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    // Helper to trigger auth events in tests
    _triggerAuthEvent: (event: AuthChangeEvent, session: Session | null) => {
      authCallback?.(event, session);
    },
  };
};
