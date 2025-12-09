import { describe, it, expect } from 'vitest';
import { getDefaultRouteForUser, isAdmin, isSuperAdmin } from './role-utils';
import type { User } from '@supabase/supabase-js';
import type { SessionInfo } from '../../types';

// =============================================================================
// Test Data Factories
// =============================================================================

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createMockSessionInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
  userId: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
  creditBalance: 100,
  isEnabled: true,
  expiresAt: '2025-12-31T00:00:00Z',
  ...overrides,
});

// =============================================================================
// getDefaultRouteForUser Tests
// =============================================================================

describe('getDefaultRouteForUser', () => {
  describe('when user is null', () => {
    it('should return /login', () => {
      expect(getDefaultRouteForUser(null)).toBe('/login');
    });

    it('should return /login even if sessionInfo is provided', () => {
      const sessionInfo = createMockSessionInfo();
      expect(getDefaultRouteForUser(null, sessionInfo)).toBe('/login');
    });
  });

  describe('when user is disabled', () => {
    const user = createMockUser();

    it('should return /account-disabled for disabled super_admin', () => {
      const sessionInfo = createMockSessionInfo({
        isEnabled: false,
        role: 'super_admin',
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/account-disabled');
    });

    it('should return /account-disabled for disabled admin', () => {
      const sessionInfo = createMockSessionInfo({
        isEnabled: false,
        role: 'admin',
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/account-disabled');
    });

    it('should return /account-disabled for disabled user', () => {
      const sessionInfo = createMockSessionInfo({
        isEnabled: false,
        role: 'user',
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/account-disabled');
    });
  });

  describe('when user is enabled - role-based routing', () => {
    const user = createMockUser();

    it('should return /admin for super_admin role', () => {
      const sessionInfo = createMockSessionInfo({
        isEnabled: true,
        role: 'super_admin',
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/admin');
    });

    it('should return /admin for admin role', () => {
      const sessionInfo = createMockSessionInfo({
        isEnabled: true,
        role: 'admin',
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/admin');
    });

    it('should return /dashboard for user role', () => {
      const sessionInfo = createMockSessionInfo({
        isEnabled: true,
        role: 'user',
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/dashboard');
    });
  });

  describe('when sessionInfo is null (fallback to user_metadata)', () => {
    it('should use user_metadata.role for admin', () => {
      const user = createMockUser({
        user_metadata: { role: 'admin' },
      });
      expect(getDefaultRouteForUser(user, null)).toBe('/admin');
    });

    it('should use user_metadata.role for super_admin', () => {
      const user = createMockUser({
        user_metadata: { role: 'super_admin' },
      });
      expect(getDefaultRouteForUser(user, null)).toBe('/admin');
    });

    it('should use user_metadata.role for user', () => {
      const user = createMockUser({
        user_metadata: { role: 'user' },
      });
      expect(getDefaultRouteForUser(user, null)).toBe('/dashboard');
    });

    it('should return /dashboard when no role in user_metadata', () => {
      const user = createMockUser({
        user_metadata: {},
      });
      expect(getDefaultRouteForUser(user, null)).toBe('/dashboard');
    });
  });

  describe('edge cases', () => {
    it('should return /dashboard for unknown role', () => {
      const user = createMockUser();
      const sessionInfo = createMockSessionInfo({
        isEnabled: true,
        role: 'unknown_role' as any,
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/dashboard');
    });

    it('should prioritize sessionInfo.role over user_metadata.role', () => {
      const user = createMockUser({
        user_metadata: { role: 'user' },
      });
      const sessionInfo = createMockSessionInfo({
        isEnabled: true,
        role: 'super_admin',
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/admin');
    });
  });
});

// =============================================================================
// isAdmin Tests
// =============================================================================

describe('isAdmin', () => {
  it('should return false for null user', () => {
    expect(isAdmin(null)).toBe(false);
  });

  it('should return true for admin role', () => {
    const user = createMockUser({
      user_metadata: { role: 'admin' },
    });
    expect(isAdmin(user)).toBe(true);
  });

  it('should return true for super_admin role', () => {
    const user = createMockUser({
      user_metadata: { role: 'super_admin' },
    });
    expect(isAdmin(user)).toBe(true);
  });

  it('should return false for user role', () => {
    const user = createMockUser({
      user_metadata: { role: 'user' },
    });
    expect(isAdmin(user)).toBe(false);
  });

  it('should return false when no role in metadata', () => {
    const user = createMockUser({
      user_metadata: {},
    });
    expect(isAdmin(user)).toBe(false);
  });
});

// =============================================================================
// isSuperAdmin Tests
// =============================================================================

describe('isSuperAdmin', () => {
  it('should return false for null user', () => {
    expect(isSuperAdmin(null)).toBe(false);
  });

  it('should return true for super_admin role', () => {
    const user = createMockUser({
      user_metadata: { role: 'super_admin' },
    });
    expect(isSuperAdmin(user)).toBe(true);
  });

  it('should return false for admin role', () => {
    const user = createMockUser({
      user_metadata: { role: 'admin' },
    });
    expect(isSuperAdmin(user)).toBe(false);
  });

  it('should return false for user role', () => {
    const user = createMockUser({
      user_metadata: { role: 'user' },
    });
    expect(isSuperAdmin(user)).toBe(false);
  });
});
