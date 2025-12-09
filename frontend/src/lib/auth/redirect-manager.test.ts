import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RedirectManager, getDefaultRouteForUser, hasRole } from './redirect-manager';
import type { User } from '@supabase/supabase-js';
import type { SessionInfo } from '../../types';
import { ROUTES } from '../config/routes';

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

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    RedirectManager.reset();
  });

  afterEach(() => {
    RedirectManager.reset();
  });

  describe('RedirectManager.canRedirect', () => {
    it('allows first redirect', () => {
      expect(RedirectManager.canRedirect('/login', '/dashboard')).toBe(true);
    });

    it('allows up to 3 redirects', () => {
      RedirectManager.recordRedirect('/login', '/dashboard');
      expect(RedirectManager.canRedirect('/dashboard', '/admin')).toBe(true);
      
      RedirectManager.recordRedirect('/dashboard', '/admin');
      expect(RedirectManager.canRedirect('/admin', '/login')).toBe(true);
    });

    it('blocks redirect after 3 redirects (loop detection)', () => {
      RedirectManager.recordRedirect('/login', '/dashboard');
      RedirectManager.recordRedirect('/dashboard', '/admin');
      RedirectManager.recordRedirect('/admin', '/login');
      
      expect(RedirectManager.canRedirect('/login', '/dashboard')).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('too many redirects'),
        expect.anything()
      );
    });

    it('detects circular redirects (A → B → A)', () => {
      RedirectManager.recordRedirect('/login', '/dashboard');
      
      expect(RedirectManager.canRedirect('/dashboard', '/login')).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Circular redirect'),
        expect.objectContaining({ from: '/dashboard', to: '/login' })
      );
    });

    it('cleans old history after timeout', async () => {
      RedirectManager.recordRedirect('/a', '/b');
      RedirectManager.recordRedirect('/b', '/c');
      RedirectManager.recordRedirect('/c', '/d');
      
      // Wait for history timeout (5 seconds + buffer)
      vi.useFakeTimers();
      vi.advanceTimersByTime(6000);
      
      // Old redirects should be cleaned, allow new ones
      expect(RedirectManager.canRedirect('/x', '/y')).toBe(true);
      
      vi.useRealTimers();
    });
  });

  describe('RedirectManager.getRedirectForAuthState', () => {
    describe('Unauthenticated Users', () => {
      it('redirects unauthenticated user to login with return URL', () => {
        const result = RedirectManager.getRedirectForAuthState(
          null,
          null,
          '/admin',
          null,
          origin
        );
        expect(result).toBe('/login?redirect=%2Fadmin');
      });

      it('redirects unauthenticated user to login from root', () => {
        const result = RedirectManager.getRedirectForAuthState(
          null,
          null,
          '/',
          null,
          origin
        );
        expect(result).toBe('/login');
      });

      it('does not redirect unauthenticated user already on login', () => {
        const result = RedirectManager.getRedirectForAuthState(
          null,
          null,
          '/login',
          null,
          origin
        );
        expect(result).toBeNull();
      });
    });

    describe('Disabled Users', () => {
      const disabledSessionInfo = createMockSessionInfo({ isEnabled: false });

      it('redirects disabled user to account-disabled page', () => {
        const user = createMockUser();
        const result = RedirectManager.getRedirectForAuthState(
          user,
          disabledSessionInfo,
          '/dashboard',
          null,
          origin
        );
        expect(result).toBe('/account-disabled');
      });

      it('does not redirect disabled user already on account-disabled', () => {
        const user = createMockUser();
        const result = RedirectManager.getRedirectForAuthState(
          user,
          disabledSessionInfo,
          '/account-disabled',
          null,
          origin
        );
        expect(result).toBeNull();
      });

      it('redirects disabled admin to account-disabled (role ignored)', () => {
        const user = createMockUser();
        const disabledAdmin = createMockSessionInfo({ isEnabled: false, role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          disabledAdmin,
          '/admin',
          null,
          origin
        );
        expect(result).toBe('/account-disabled');
      });
    });

    describe('Enabled Users on Account-Disabled Page', () => {
      it('redirects enabled user away from account-disabled page', () => {
        const user = createMockUser();
        const enabledUser = createMockSessionInfo({ isEnabled: true, role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          enabledUser,
          '/account-disabled',
          null,
          origin
        );
        expect(result).toBe('/dashboard');
      });

      it('redirects enabled admin away from account-disabled page', () => {
        const user = createMockUser();
        const enabledAdmin = createMockSessionInfo({ isEnabled: true, role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          enabledAdmin,
          '/account-disabled',
          null,
          origin
        );
        expect(result).toBe('/admin');
      });
    });

    describe('Authenticated Users on Login Page', () => {
      const user = createMockUser();

      it('redirects authenticated regular user from login to dashboard', () => {
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          null,
          origin
        );
        expect(result).toBe('/dashboard');
      });

      it('redirects authenticated admin from login to admin', () => {
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          null,
          origin
        );
        expect(result).toBe('/admin');
      });

      it('uses safe redirect parameter when provided', () => {
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          '/dashboard',
          origin
        );
        expect(result).toBe('/dashboard');
      });

      it('sanitizes unsafe redirect parameter', () => {
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          'https://evil.com',
          origin
        );
        // Should fall back to default for user
        expect(result).toBe('/dashboard');
      });

      it('ignores redirect parameter pointing back to login', () => {
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          '/login',
          origin
        );
        expect(result).toBe('/admin');
      });
    });

    describe('Root Path Redirects', () => {
      it('redirects regular user from root to dashboard', () => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/',
          null,
          origin
        );
        expect(result).toBe('/dashboard');
      });

      it('redirects admin from root to admin page', () => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/',
          null,
          origin
        );
        expect(result).toBe('/admin');
      });

      it('redirects super_admin from root to admin page', () => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'super_admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/',
          null,
          origin
        );
        expect(result).toBe('/admin');
      });
    });

    describe('No Redirect Needed', () => {
      it('returns null for authenticated user on valid page', () => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/dashboard',
          null,
          origin
        );
        expect(result).toBeNull();
      });

      it('returns null for admin on admin page', () => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/admin',
          null,
          origin
        );
        expect(result).toBeNull();
      });
    });
  });

  describe('getDefaultRouteForUser', () => {
    const user = createMockUser();

    it('returns login when sessionInfo is null (fail-safe)', () => {
      const result = getDefaultRouteForUser(user, null);
      expect(result).toBe('/login');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('No sessionInfo available')
      );
    });

    it('returns account-disabled for disabled users', () => {
      const sessionInfo = createMockSessionInfo({ isEnabled: false });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/account-disabled');
    });

    it('returns /admin for super_admin role', () => {
      const sessionInfo = createMockSessionInfo({ role: 'super_admin', isEnabled: true });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/admin');
    });

    it('returns /admin for admin role', () => {
      const sessionInfo = createMockSessionInfo({ role: 'admin', isEnabled: true });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/admin');
    });

    it('returns /dashboard for user role', () => {
      const sessionInfo = createMockSessionInfo({ role: 'user', isEnabled: true });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/dashboard');
    });

    it('returns /dashboard for unknown role (fallback)', () => {
      const sessionInfo = createMockSessionInfo({ role: 'unknown_role', isEnabled: true });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/dashboard');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unknown role')
      );
    });

    it('uses only sessionInfo.role, not user_metadata.role (SECURITY)', () => {
      // Even if user_metadata has admin role, should use sessionInfo role
      const userWithMetadata = createMockUser({
        user_metadata: { role: 'admin' }
      });
      const sessionInfo = createMockSessionInfo({ role: 'user', isEnabled: true });
      
      const result = getDefaultRouteForUser(userWithMetadata, sessionInfo);
      
      // Should respect sessionInfo role (user), not user_metadata role (admin)
      expect(result).toBe('/dashboard');
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
      const user = createMockUser();
      const sessionInfo = createMockSessionInfo({ role: 'user', isEnabled: true });

      // User signs in on login page
      const redirect1 = RedirectManager.getRedirectForAuthState(
        user,
        sessionInfo,
        '/login',
        null,
        origin
      );
      expect(redirect1).toBe('/dashboard');

      // Record the redirect
      if (redirect1) {
        RedirectManager.recordRedirect('/login', redirect1);
      }

      // User arrives at dashboard - no redirect needed
      const redirect2 = RedirectManager.getRedirectForAuthState(
        user,
        sessionInfo,
        '/dashboard',
        null,
        origin
      );
      expect(redirect2).toBeNull();
    });

    it('prevents redirect loop for disabled user', () => {
      const user = createMockUser();
      const disabledSessionInfo = createMockSessionInfo({ isEnabled: false });

      // First redirect to account-disabled
      const redirect1 = RedirectManager.getRedirectForAuthState(
        user,
        disabledSessionInfo,
        '/admin',
        null,
        origin
      );
      expect(redirect1).toBe('/account-disabled');

      // Already on account-disabled - no redirect
      const redirect2 = RedirectManager.getRedirectForAuthState(
        user,
        disabledSessionInfo,
        '/account-disabled',
        null,
        origin
      );
      expect(redirect2).toBeNull();
    });

    it('handles account re-enablement flow', () => {
      const user = createMockUser();
      
      // User is disabled
      const disabledSessionInfo = createMockSessionInfo({ isEnabled: false, role: 'user' });
      const redirect1 = RedirectManager.getRedirectForAuthState(
        user,
        disabledSessionInfo,
        '/dashboard',
        null,
        origin
      );
      expect(redirect1).toBe('/account-disabled');

      // Admin re-enables the account
      const enabledSessionInfo = createMockSessionInfo({ isEnabled: true, role: 'user' });
      const redirect2 = RedirectManager.getRedirectForAuthState(
        user,
        enabledSessionInfo,
        '/account-disabled',
        null,
        origin
      );
      expect(redirect2).toBe('/dashboard');
    });
  });
});
