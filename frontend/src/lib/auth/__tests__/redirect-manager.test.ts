import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RedirectManager, getDefaultRouteForUser } from '../redirect-manager';
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

  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => { });
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

      it('prevents redirect loop for disabled user', () => {
        const user = createMockUser();
        const disabledSessionInfo = createMockSessionInfo({ isEnabled: false });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          disabledSessionInfo,
          '/account-disabled',
          null,
          origin
        );
        expect(result).toBeNull();
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

      it('redirects enabled super admin away from account-disabled page', () => {
        const user = createMockUser();
        const enabledSuperAdmin = createMockSessionInfo({ isEnabled: true, role: 'super_admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          enabledSuperAdmin,
          '/account-disabled',
          null,
          origin
        );
        expect(result).toBe('/admin');
      });
    });

    describe('Enabled Users on Login Page', () => {
      it('redirects authenticated regular user from login to dashboard', () => {
        const user = createMockUser();
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
        const user = createMockUser();
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
        const user = createMockUser();
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
        const user = createMockUser();
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
        const user = createMockUser();
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

      it('blocks admin redirect to admin for regular user', () => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'user' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          '/admin',
          origin
        );
        // Regular users cannot access admin routes
        expect(result).toBe('/dashboard');
      });

      it('allows admin redirect to admin for admin user', () => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role: 'admin' });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/login',
          '/admin',
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

      it('redirects super admin from root to admin page', () => {
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

      it('redirects disabled user from root to account-disabled', () => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ isEnabled: false });
        const result = RedirectManager.getRedirectForAuthState(
          user,
          sessionInfo,
          '/',
          null,
          origin
        );
        expect(result).toBe('/account-disabled');
      });

      it('does not redirect user already on valid page', () => {
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

      it('does not redirect admin already on valid page', () => {
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

    describe('Edge Cases', () => {
      it('handles null user and null sessionInfo', () => {
        const result = RedirectManager.getRedirectForAuthState(
          null,
          null,
          '/dashboard',
          null,
          origin
        );
        expect(result).toBe('/login?redirect=%2Fdashboard');
      });

      it('handles user with null sessionInfo', () => {
        const user = createMockUser();
        const result = RedirectManager.getRedirectForAuthState(
          user,
          null,
          '/login',
          null,
          origin
        );
        expect(result).toBe('/login');
      });

      it('handles enabled user with null sessionInfo on login page', () => {
        const user = createMockUser();
        const result = RedirectManager.getRedirectForAuthState(
          user,
          null,
          '/login',
          null,
          origin
        );
        expect(result).toBe('/login');
      });
    });
  });

  describe('getDefaultRouteForUser', () => {
    it('returns login for null user', () => {
      const result = getDefaultRouteForUser(null, null);
      expect(result).toBe('/login');
    });

    it('returns login for user with null sessionInfo', () => {
      const user = createMockUser();
      const result = getDefaultRouteForUser(user, null);
      expect(result).toBe('/login');
    });

    it('returns account-disabled for disabled user', () => {
      const user = createMockUser();
      const sessionInfo = createMockSessionInfo({ isEnabled: false });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/account-disabled');
    });

    it('returns dashboard for enabled regular user', () => {
      const user = createMockUser();
      const sessionInfo = createMockSessionInfo({ role: 'user' });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/dashboard');
    });

    it('returns admin for enabled admin', () => {
      const user = createMockUser();
      const sessionInfo = createMockSessionInfo({ role: 'admin' });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/admin');
    });

    it('returns admin for enabled super_admin', () => {
      const user = createMockUser();
      const sessionInfo = createMockSessionInfo({ role: 'super_admin' });
      const result = getDefaultRouteForUser(user, sessionInfo);
      expect(result).toBe('/admin');
    });
  });
});
