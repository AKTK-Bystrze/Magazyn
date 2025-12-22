import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedirectManager, hasRole, type RedirectContext } from '../redirect-manager';
import type { User } from '@supabase/supabase-js';
import type { SessionInfo } from '../../../types';


describe('redirect-manager', () => {
  const origin = 'http://localhost:4321';

  // Mock user helper
  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'test-user-id',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  } as User);

  // Mock sessionInfo helper
  const createMockSessionInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
    userId: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    isEnabled: true,
    role: 'user',
    creditBalance: 100,
    expiresAt: '2025-12-31T00:00:00Z',
    ...overrides,
  });

  // Helper to create fresh context for each test
  const createContext = (): RedirectContext => ({ history: [] });

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  describe('RedirectManager.canRedirect', () => {
    it('allows first redirect', () => {
      const ctx = createContext();
      expect(RedirectManager.canRedirect('/login', '/dashboard', ctx)).toBe(true);
    });

    it('allows up to 3 redirects', () => {
      const ctx = createContext();
      RedirectManager.recordRedirect('/login', '/dashboard', ctx);
      expect(RedirectManager.canRedirect('/dashboard', '/admin', ctx)).toBe(true);
      
      RedirectManager.recordRedirect('/dashboard', '/admin', ctx);
      expect(RedirectManager.canRedirect('/admin', '/login', ctx)).toBe(true);
    });

    it('blocks redirect after 3 redirects (loop detection)', () => {
      const ctx = createContext();
      RedirectManager.recordRedirect('/login', '/dashboard', ctx);
      RedirectManager.recordRedirect('/dashboard', '/admin', ctx);
      RedirectManager.recordRedirect('/admin', '/login', ctx);
      
      expect(RedirectManager.canRedirect('/login', '/dashboard', ctx)).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('too many redirects'),
        expect.anything()
      );
    });

    it('detects circular redirects (A → B → A)', () => {
      const ctx = createContext();
      RedirectManager.recordRedirect('/login', '/dashboard', ctx);
      
      expect(RedirectManager.canRedirect('/dashboard', '/login', ctx)).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Circular redirect'),
        expect.objectContaining({ from: '/dashboard', to: '/login' })
      );
    });

    it('cleans old history after timeout', async () => {
      const ctx = createContext();
      RedirectManager.recordRedirect('/a', '/b', ctx);
      RedirectManager.recordRedirect('/b', '/c', ctx);
      RedirectManager.recordRedirect('/c', '/d', ctx);
      
      // Wait for history timeout (5 seconds + buffer)
      vi.useFakeTimers();
      vi.advanceTimersByTime(6000);
      
      // Old redirects should be cleaned, allow new ones
      expect(RedirectManager.canRedirect('/x', '/y', ctx)).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('RedirectManager.getRedirectForAuthState', () => {
    describe('Unauthenticated Users', () => {
      it('redirects unauthenticated user to login with return URL', () => {
        const ctx = createContext();
        const result = RedirectManager.getRedirectForAuthState(
          null,
          null,
          '/admin',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/login?redirect=%2Fadmin');
      });

      it('redirects unauthenticated user to login from root', () => {
        const ctx = createContext();
        const result = RedirectManager.getRedirectForAuthState(
          null,
          null,
          '/',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/login');
      });

      it('does not redirect unauthenticated user already on login', () => {
        const ctx = createContext();
        const result = RedirectManager.getRedirectForAuthState(
          null,
          null,
          '/login',
          null,
          origin,
          ctx
        );
        expect(result).toBeNull();
      });
    });

    describe('Disabled Users', () => {
      const disabledSessionInfo = createMockSessionInfo({ isEnabled: false });

      it('redirects disabled user to account-disabled page', () => {
        const ctx = createContext();
        const user = createMockUser();
        const result = RedirectManager.getRedirectForAuthState(
          user,
          disabledSessionInfo,
          '/dashboard',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/account-disabled');
      });

      it('does not redirect disabled user already on account-disabled', () => {
        const ctx = createContext();
        const user = createMockUser();
        const result = RedirectManager.getRedirectForAuthState(
          user,
          disabledSessionInfo,
          '/account-disabled',
          null,
          origin,
          ctx
        );
        expect(result).toBeNull();
      });

      it('redirects disabled admin to account-disabled (role ignored)', () => {
        const ctx = createContext();
        const user = createMockUser();
        const disabledAdmin = createMockSessionInfo({ isEnabled: false, role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          disabledAdmin,
          '/admin',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/account-disabled');
      });
    });

    describe('Enabled Users on Account-Disabled Page', () => {
      it('redirects enabled user away from account-disabled page', () => {
        const ctx = createContext();
        const user = createMockUser();
        const enabledUser = createMockSessionInfo({ isEnabled: true, role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          enabledUser,
          '/account-disabled',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/dashboard');
      });

      it('redirects enabled admin away from account-disabled page', () => {
        const ctx = createContext();
        const user = createMockUser();
        const enabledAdmin = createMockSessionInfo({ isEnabled: true, role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          enabledAdmin,
          '/account-disabled',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/admin');
      });
    });

    describe('Authenticated Users on Login Page', () => {
      const user = createMockUser();

      it('redirects authenticated regular user from login to dashboard', () => {
        const ctx = createContext();
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/dashboard');
      });

      it('redirects authenticated admin from login to admin', () => {
        const ctx = createContext();
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/admin');
      });

      it('uses safe redirect parameter when provided', () => {
        const ctx = createContext();
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          '/dashboard',
          origin,
          ctx
        );
        expect(result).toBe('/dashboard');
      });

      it('sanitizes unsafe redirect parameter', () => {
        const ctx = createContext();
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          'https://evil.com',
          origin,
          ctx
        );
        // Should fall back to default for user
        expect(result).toBe('/dashboard');
      });

      it('ignores redirect parameter pointing back to login', () => {
        const ctx = createContext();
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          '/login',
          origin,
          ctx
        );
        expect(result).toBe('/admin');
      });
    });

    describe('Root Path Redirects', () => {
      it('redirects regular user from root to dashboard', () => {
        const ctx = createContext();
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/dashboard');
      });

      it('redirects admin from root to admin page', () => {
        const ctx = createContext();
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/admin');
      });

      it('redirects super_admin from root to admin page', () => {
        const ctx = createContext();
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'super_admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/',
          null,
          origin,
          ctx
        );
        expect(result).toBe('/admin');
      });
    });

    describe('No Redirect Needed', () => {
      it('returns null for authenticated user on valid page', () => {
        const ctx = createContext();
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/dashboard',
          null,
          origin,
          ctx
        );
        expect(result).toBeNull();
      });

      it('returns null for admin on admin page', () => {
        const ctx = createContext();
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/admin',
          null,
          origin,
          ctx
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('hasRole', () => {
    it('returns true when role matches one of allowed roles', () => {
      expect(hasRole('admin', ['admin', 'super_admin'])).toBe(true);
    });

    it('returns true for exact match', () => {
      expect(hasRole('user', ['user'])).toBe(true);
    });

    it('returns false when role does not match', () => {
      expect(hasRole('user', ['admin', 'super_admin'])).toBe(false);
    });

    it('returns false for undefined role', () => {
      expect(hasRole(undefined, ['admin'])).toBe(false);
    });

    it('returns false for empty allowed roles', () => {
      expect(hasRole('admin', [])).toBe(false);
    });

    it('handles case-sensitive matching', () => {
      expect(hasRole('Admin', ['admin'])).toBe(false);
      expect(hasRole('admin', ['Admin'])).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    it('handles full redirect flow from login to dashboard', () => {
      const ctx = createContext();
      const user = createMockUser();
      const sessionInfo = createMockSessionInfo({ role: 'user', isEnabled: true });

      // User signs in on login page
      const redirect1 = RedirectManager.getRedirectForAuthState(
        user,
        sessionInfo,
        '/login',
        null,
        origin,
        ctx
      );
      expect(redirect1).toBe('/dashboard');

      // Record the redirect
      if (redirect1) {
        RedirectManager.recordRedirect('/login', redirect1, ctx);
      }

      // User arrives at dashboard - no redirect needed
      const redirect2 = RedirectManager.getRedirectForAuthState(
        user,
        sessionInfo,
        '/dashboard',
        null,
        origin,
        ctx
      );
      expect(redirect2).toBeNull();
    });

    it('prevents redirect loop for disabled user', () => {
      const ctx = createContext();
      const user = createMockUser();
      const disabledSessionInfo = createMockSessionInfo({ isEnabled: false });

      // First redirect to account-disabled
      const redirect1 = RedirectManager.getRedirectForAuthState(
        user,
        disabledSessionInfo,
        '/admin',
        null,
        origin,
        ctx
      );
      expect(redirect1).toBe('/account-disabled');

      // Already on account-disabled - no redirect
      const redirect2 = RedirectManager.getRedirectForAuthState(
        user,
        disabledSessionInfo,
        '/account-disabled',
        null,
        origin,
        ctx
      );
      expect(redirect2).toBeNull();
    });

    it('handles account re-enablement flow', () => {
      const ctx = createContext();
      const user = createMockUser();
      
      // User is disabled
      const disabledSessionInfo = createMockSessionInfo({ isEnabled: false, role: 'user' });
      const redirect1 = RedirectManager.getRedirectForAuthState(
        user,
        disabledSessionInfo,
        '/dashboard',
        null,
        origin,
        ctx
      );
      expect(redirect1).toBe('/account-disabled');

      // Admin re-enables the account
      const enabledSessionInfo = createMockSessionInfo({ isEnabled: true, role: 'user' });
      const redirect2 = RedirectManager.getRedirectForAuthState(
        user,
        enabledSessionInfo,
        '/account-disabled',
        null,
        origin,
        ctx
      );
      expect(redirect2).toBe('/dashboard');
    });
  });
});
