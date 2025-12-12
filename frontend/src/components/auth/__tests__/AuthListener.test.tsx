/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import type { Session, User, AuthChangeEvent } from '@supabase/supabase-js';

// =============================================================================
// Mock Setup - Must be at top level using factory pattern
// =============================================================================

// Mock getUserSession
vi.mock('@/lib/auth/session-utils', () => ({
  getUserSession: vi.fn(),
}));

// Mock getDefaultRouteForUser
vi.mock('@/lib/auth/role-utils', () => ({
  getDefaultRouteForUser: vi.fn(),
}));

// Mock RedirectManager
vi.mock('@/lib/auth/redirect-manager', () => ({
  RedirectManager: {
    getRedirectForAuthState: vi.fn(),
    canRedirect: vi.fn(() => true),
    recordRedirect: vi.fn(),
    reset: vi.fn(),
  },
}));

// Mock Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      setSession: vi.fn(),
    },
  },
}));

// Import mocked modules to get access to the mocks
import { AuthListener } from '../AuthListener';
import { getUserSession } from '@/lib/auth/session-utils';
import { getDefaultRouteForUser } from '@/lib/auth/role-utils';
import { RedirectManager } from '@/lib/auth/redirect-manager';
import { supabase } from '@/lib/supabase';

// =============================================================================
// Test Utilities
// =============================================================================

const createMockUser = (): User => ({
  id: 'test-user-id',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
});

const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: 'bearer',
  user: createMockUser(),
  ...overrides,
});

// Mock window.location
const mockLocation = {
  href: '',
  pathname: '/login',
  search: '',
  hash: '',
  origin: 'http://localhost:4321',
  replace: vi.fn(), // Mock replace to prevent errors
};

// Mock document.cookie
let mockCookie = '';

// =============================================================================
// Global Setup
// =============================================================================

describe('AuthListener', () => {
  let authStateCallback: ((event: AuthChangeEvent, session: Session | null) => Promise<void>) | null = null;
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset location mock
    mockLocation.href = '';
    mockLocation.pathname = '/login';
    mockLocation.search = '';
    mockLocation.hash = '';
    mockLocation.replace = mockReplace; // Connect mockReplace to location object

    // Reset cookie mock
    mockCookie = '';

    // Use vi.stubGlobal to properly mock window.location in jsdom
    vi.stubGlobal('location', {
      ...mockLocation,
      replace: mockReplace,
    });

    Object.defineProperty(document, 'cookie', {
      get: () => mockCookie,
      set: (value: string) => {
        mockCookie = value;
      },
      configurable: true,
    });

    // Mock window.history.replaceState
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

    // Setup onAuthStateChange to capture callback
    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateCallback = callback as any;
      return {
        data: {
          subscription: {
            id: 'test-subscription',
            callback: vi.fn(),
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    // Default mock returns
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    vi.mocked(supabase.auth.setSession).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });
    vi.mocked(getUserSession).mockResolvedValue(null);
    vi.mocked(getDefaultRouteForUser).mockReturnValue('/dashboard');

    // Default RedirectManager mock returns
    vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue(null);
    vi.mocked(RedirectManager.canRedirect).mockReturnValue(true);
  });

  afterEach(() => {
    authStateCallback = null;
    vi.unstubAllGlobals(); // Clean up global stubs
  });

  // ===========================================================================
  // Cookie Management Tests
  // ===========================================================================

  describe('Cookie Management', () => {
    it('should set cookie on SIGNED_IN event', async () => {
      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        userId: 'test-id',
        email: 'test@test.com',
        username: 'test',
        isEnabled: true,
        role: 'user',
        creditBalance: 100,
        expiresAt: '2025-12-31T00:00:00Z',
      } as any);

      await act(async () => {
        await authStateCallback?.('SIGNED_IN', session);
      });

      await waitFor(() => {
        expect(mockCookie).toContain('magazyn-auth-token=mock-access-token');
      });
    });

    it('should include correct cookie attributes', async () => {
      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: 'user',
      } as any);

      await act(async () => {
        await authStateCallback?.('SIGNED_IN', session);
      });

      await waitFor(() => {
        expect(mockCookie).toContain('path=/');
        expect(mockCookie).toContain('SameSite=Lax');
      });
    });

    it('should clear cookie on SIGNED_OUT event', async () => {
      mockCookie = 'magazyn-auth-token=existing-token; path=/';

      render(<AuthListener />);

      await act(async () => {
        await authStateCallback?.('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(mockCookie).toContain('max-age=0');
      });
    });
  });

  // ===========================================================================
  // Magic Link Hash Processing Tests
  // ===========================================================================

  describe('Magic Link Hash Processing', () => {
    it('should detect and process access_token in URL hash', async () => {
      // Update location with hash BEFORE rendering
      mockLocation.hash = '#access_token=hash-access-token&refresh_token=hash-refresh-token&expires_in=3600';
      mockLocation.pathname = '/login';
      vi.stubGlobal('location', { ...mockLocation, replace: vi.fn() });

      const session = createMockSession({ access_token: 'hash-access-token' });
      vi.mocked(supabase.auth.setSession).mockResolvedValue({
        data: { session, user: session.user },
        error: null,
      });
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: 'admin',
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue('/admin');

      await act(async () => {
        render(<AuthListener />);
        // Give useEffect time to execute
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await waitFor(() => {
        expect(supabase.auth.setSession).toHaveBeenCalledWith({
          access_token: 'hash-access-token',
          refresh_token: 'hash-refresh-token',
        });
      }, { timeout: 2000 });
    });

    it('should clean URL hash after processing', async () => {
      // Update location with hash BEFORE rendering
      mockLocation.hash = '#access_token=token&refresh_token=refresh';
      mockLocation.pathname = '/login';
      vi.stubGlobal('location', { ...mockLocation, replace: vi.fn() });

      const session = createMockSession();
      vi.mocked(supabase.auth.setSession).mockResolvedValue({
        data: { session, user: session.user },
        error: null,
      });
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: 'user',
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue('/dashboard');

      await act(async () => {
        render(<AuthListener />);
        // Give useEffect time to execute
        await new Promise(resolve => setTimeout(resolve, 200));
      });

      await waitFor(() => {
        expect(window.history.replaceState).toHaveBeenCalled();
      }, { timeout: 2000 });
    });

    it('should not process hash without access_token', async () => {
      mockLocation.hash = '#some_other_param=value';

      render(<AuthListener />);

      // Wait a bit to ensure no processing happens
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Redirect Logic Tests - Enabled Users
  // ===========================================================================

  describe('Redirect Logic - Enabled Users', () => {
    it('should redirect super_admin to /admin', async () => {
      mockLocation.pathname = '/login';
      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: 'super_admin',
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue('/admin');

      await act(async () => {
        await authStateCallback?.('SIGNED_IN', session);
        // Wait for the async redirect logic including cookie wait time
        await new Promise((resolve) => setTimeout(resolve, 400));
      });

      expect(mockReplace).toHaveBeenCalledWith('/admin');
    });

    it('should redirect admin to /admin', async () => {
      mockLocation.pathname = '/login';
      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: 'admin',
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue('/admin');

      await act(async () => {
        await authStateCallback?.('SIGNED_IN', session);
        await new Promise((resolve) => setTimeout(resolve, 400));
      });

      expect(mockReplace).toHaveBeenCalledWith('/admin');
    });

    it('should redirect user to /dashboard', async () => {
      mockLocation.pathname = '/login';
      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: 'user',
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue('/dashboard');

      await act(async () => {
        await authStateCallback?.('SIGNED_IN', session);
        await new Promise((resolve) => setTimeout(resolve, 400));
      });

      expect(mockReplace).toHaveBeenCalledWith('/dashboard');
    });
  });

  // ===========================================================================
  // Redirect Logic Tests - Disabled Users
  // ===========================================================================

  describe('Redirect Logic - Disabled Users', () => {
    it('should redirect disabled user to /account-disabled', async () => {
      mockLocation.pathname = '/login';
      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: false,
        role: 'super_admin',
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue('/account-disabled');

      await act(async () => {
        await authStateCallback?.('SIGNED_IN', session);
        await new Promise((resolve) => setTimeout(resolve, 400));
      });

      expect(mockReplace).toHaveBeenCalledWith('/account-disabled');
    });

    it('should override redirect param when user is disabled', async () => {
      mockLocation.pathname = '/login';
      mockLocation.search = '?redirect=/dashboard';

      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: false,
        role: 'user',
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue('/account-disabled');

      await act(async () => {
        await authStateCallback?.('SIGNED_IN', session);
        await new Promise((resolve) => setTimeout(resolve, 400));
      });

      expect(mockReplace).toHaveBeenCalledWith('/account-disabled');
    });
  });

  // ===========================================================================
  // Redirect Prevention Tests
  // ===========================================================================

  describe('Redirect Prevention', () => {
    it('should not redirect if already on target page', async () => {
      mockLocation.pathname = '/admin';

      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: 'super_admin',
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue(null);

      await act(async () => {
        await authStateCallback?.('SIGNED_IN', session);
        await new Promise((resolve) => setTimeout(resolve, 400));
      });

      // Should not be called because we're already on the target page
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // SIGNED_OUT Event Tests
  // ===========================================================================

  describe('SIGNED_OUT Event', () => {
    it('should clear cookie on sign out', async () => {
      mockCookie = 'magazyn-auth-token=old-token; path=/';

      render(<AuthListener />);

      await act(async () => {
        await authStateCallback?.('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(mockCookie).toContain('max-age=0');
      });
    });
  });

  // ===========================================================================
  // Cleanup Tests
  // ===========================================================================

  describe('Cleanup', () => {
    it('should unsubscribe from auth state changes on unmount', () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: {
          subscription: {
            id: 'test',
            callback: vi.fn(),
            unsubscribe: mockUnsubscribe,
          },
        },
      });

      const { unmount } = render(<AuthListener />);
      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});
