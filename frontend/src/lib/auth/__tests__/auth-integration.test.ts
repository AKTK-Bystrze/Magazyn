import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setAuthCookie, hasAuthCookie } from '@/lib/auth/cookie-utils';
import { getUserSession } from '@/lib/auth/session-utils';
import { RedirectManager } from '@/lib/auth/redirect-manager';
import { isSafeRedirect } from '@/lib/auth/url-utils';
import type { SessionInfo } from '@/types';

/**
 * Simple Integration Tests
 * 
 * Purpose: Verify that auth utilities work together correctly
 * Scope: Minimal mocking, focus on module integration
 * 
 * Note: This is NOT a replacement for unit tests. These tests verify
 * that the modules integrate properly with each other.
 */

// Mock only external dependencies (fetch)
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('Auth Integration Tests', () => {
  let mockCookie = '';

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookie = '';
    RedirectManager.reset();

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      get: () => mockCookie,
      set: (value: string) => {
        if (value.includes('max-age=0')) {
          const cookieName = value.split('=')[0];
          mockCookie = mockCookie
            .split('; ')
            .filter(c => !c.startsWith(cookieName))
            .join('; ');
        } else {
          mockCookie = value;
        }
      },
      configurable: true,
    });
  });

  describe('Login Flow Integration', () => {
    it('completes full login flow: session fetch → cookie set → redirect decision', async () => {
      // 1. Mock successful session fetch
      const mockSession: SessionInfo = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        isEnabled: true,
        creditBalance: 100,
        expiresAt: '2025-12-31T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSession),
        headers: new Headers(),
      });

      // 2. Fetch user session
      const session = await getUserSession('mock-access-token');
      expect(session).toEqual(mockSession);

      // 3. Set auth cookie
      setAuthCookie('mock-access-token');
      expect(hasAuthCookie()).toBe(true);

      // 4. Determine redirect
      const mockUser = { id: 'user-123', email: 'test@example.com' } as any;
      const redirect = RedirectManager.getRedirectForAuthState(
        mockUser,
        session,
        '/login',
        null,
        'http://localhost:4321'
      );

      // 5. Verify redirect is safe
      expect(redirect).toBe('/dashboard');
      expect(isSafeRedirect(redirect!, 'http://localhost:4321')).toBe(true);
    });

    it('handles disabled user flow: session fetch → redirect to account-disabled', async () => {
      // 1. Mock disabled user session
      const disabledSession: SessionInfo = {
        userId: 'user-456',
        email: 'disabled@example.com',
        username: 'disableduser',
        role: 'user',
        isEnabled: false,
        creditBalance: 0,
        expiresAt: '2025-12-31T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(disabledSession),
        headers: new Headers(),
      });

      // 2. Fetch session
      const session = await getUserSession('mock-token');
      expect(session?.isEnabled).toBe(false);

      // 3. Determine redirect
      const mockUser = { id: 'user-456', email: 'disabled@example.com' } as any;
      const redirect = RedirectManager.getRedirectForAuthState(
        mockUser,
        session,
        '/dashboard',
        null,
        'http://localhost:4321'
      );

      // 4. Verify disabled user redirects correctly
      expect(redirect).toBe('/account-disabled');
    });

    it('handles admin flow: session fetch → redirect to admin page', async () => {
      // 1. Mock admin session
      const adminSession: SessionInfo = {
        userId: 'admin-789',
        email: 'admin@example.com',
        username:'admin',
        role: 'super_admin',
        isEnabled: true,
        creditBalance: 1000,
        expiresAt: '2025-12-31T00:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(adminSession),
        headers: new Headers(),
      });

      // 2. Fetch session
      const session = await getUserSession('admin-token');
      expect(session?.role).toBe('super_admin');

      // 3. Set cookie
      setAuthCookie('admin-token');

      // 4. Determine redirect
      const mockUser = { id: 'admin-789', email: 'admin@example.com' } as any;
      const redirect = RedirectManager.getRedirectForAuthState(
        mockUser,
        session,
        '/login',
        null,
        'http://localhost:4321'
      );

      // 5. Verify admin redirects to admin page
      expect(redirect).toBe('/admin');
      expect(hasAuthCookie()).toBe(true);
    });
  });

  describe('Security Integration', () => {
    it('rejects external redirect even with valid session', async () => {
      // Setup valid session
      const validSession: SessionInfo = {
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser',
        role: 'user',
        isEnabled: true,
        creditBalance: 100,
        expiresAt: '2025-12-31T00:00:00Z',
      };

      // Attempt redirect to external URL
      const maliciousRedirect = 'https://evil.com/steal-data';
      
      // URL validation should reject it
      expect(isSafeRedirect(maliciousRedirect, 'http://localhost:4321')).toBe(false);
      
      // RedirectManager should sanitize it
      const mockUser = { id: 'user-123', email: 'test@example.com' } as any;
      const redirect = RedirectManager.getRedirectForAuthState(
        mockUser,
        validSession,
        '/login',
        maliciousRedirect, // Malicious redirect param
        'http://localhost:4321'
      );
      
      // Should fall back to safe default, not use malicious URL
      expect(redirect).toBe('/dashboard');
    });
  });
});
