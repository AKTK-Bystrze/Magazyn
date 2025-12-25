# Frontend Authentication Unit Testing Plan

> [!NOTE]
> **Based on**: [.agent/rules/vitest-unit-testing.md](file:///e:/bystrze/Magazyn/.agent/rules/vitest-unit-testing.md), [.agent/rules/react.md](file:///e:/bystrze/Magazyn/.agent/rules/react.md)  
> **Documentation**: [auth-description.md](file:///e:/bystrze/Magazyn/.ai/loop/auth-description.md), [report.md](file:///e:/bystrze/Magazyn/.ai/loop/report.md)

This plan focuses on **unit tests** for frontend authentication using **Vitest** with project conventions.

---

## Table of Contents

1. [Setup Requirements](#setup-requirements)
2. [Test File Structure](#test-file-structure)
3. [Unit Tests: role-utils.ts](#unit-tests-role-utilsts)
4. [Unit Tests: session-utils.ts](#unit-tests-session-utilsts)
5. [Unit Tests: AuthListener.tsx](#unit-tests-authlistenertsx)
6. [Test Utilities & Mocks](#test-utilities--mocks)
7. [Implementation Checklist](#implementation-checklist)

---

## Setup Requirements

### 1. Install Dependencies

```bash
cd frontend
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom
```

### 2. Create Vitest Configuration

**File**: `frontend/vitest.config.ts`

```typescript
import { defineConfig } from 'vitest/config';
import react from '@astrojs/react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/lib/auth/**',
        'src/components/auth/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});
```

### 3. Add Test Scripts to package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 4. Create Test Setup File

**File**: `frontend/src/test/setup.ts`

```typescript
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock import.meta.env for Vite environment variables
vi.stubGlobal('import', {
  meta: {
    env: {
      PUBLIC_BACKEND_URL: 'http://localhost:8080',
      PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});

// Reset mocks between tests
beforeEach(() => {
  vi.clearAllMocks();
});
```

---

## Test File Structure

```
frontend/src/
├── lib/auth/
│   ├── role-utils.ts
│   ├── role-utils.test.ts          ← NEW
│   ├── session-utils.ts
│   └── session-utils.test.ts       ← NEW
├── components/auth/
│   ├── AuthListener.tsx
│   └── AuthListener.test.tsx       ← NEW
└── test/
    ├── setup.ts                    ← NEW
    └── mocks/
        ├── supabase.ts             ← NEW
        └── user.ts                 ← NEW
```

---

## Unit Tests: role-utils.ts

**File**: `frontend/src/lib/auth/role-utils.test.ts`

```typescript
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
        role: 'super_admin' 
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/account-disabled');
    });

    it('should return /account-disabled for disabled admin', () => {
      const sessionInfo = createMockSessionInfo({ 
        isEnabled: false, 
        role: 'admin' 
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/account-disabled');
    });

    it('should return /account-disabled for disabled user', () => {
      const sessionInfo = createMockSessionInfo({ 
        isEnabled: false, 
        role: 'user' 
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/account-disabled');
    });
  });

  describe('when user is enabled - role-based routing', () => {
    const user = createMockUser();

    it('should return /admin for super_admin role', () => {
      const sessionInfo = createMockSessionInfo({ 
        isEnabled: true, 
        role: 'super_admin' 
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/admin');
    });

    it('should return /admin for admin role', () => {
      const sessionInfo = createMockSessionInfo({ 
        isEnabled: true, 
        role: 'admin' 
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/admin');
    });

    it('should return /dashboard for user role', () => {
      const sessionInfo = createMockSessionInfo({ 
        isEnabled: true, 
        role: 'user' 
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
        role: 'unknown_role' as any 
      });
      expect(getDefaultRouteForUser(user, sessionInfo)).toBe('/dashboard');
    });

    it('should prioritize sessionInfo.role over user_metadata.role', () => {
      const user = createMockUser({
        user_metadata: { role: 'user' },
      });
      const sessionInfo = createMockSessionInfo({ 
        isEnabled: true, 
        role: 'super_admin' 
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
```

---

## Unit Tests: session-utils.ts

**File**: `frontend/src/lib/auth/session-utils.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getUserSession } from './session-utils';
import type { SessionInfo } from '../../types';

// =============================================================================
// Mock Setup using vi.mock() factory pattern
// =============================================================================

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Suppress console logs during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// =============================================================================
// Test Data
// =============================================================================

const mockSessionInfo: SessionInfo = {
  userId: 'uuid-12345',
  email: 'test@example.com',
  username: 'testuser',
  role: 'super_admin',
  creditBalance: 500,
  isEnabled: true,
  expiresAt: '2025-12-31T00:00:00Z',
};

const validAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validtoken';

// =============================================================================
// getUserSession Tests
// =============================================================================

describe('getUserSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('successful response', () => {
    it('should return SessionInfo on 200 OK response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSessionInfo),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);

      expect(result).toEqual(mockSessionInfo);
    });

    it('should send correct Authorization header', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSessionInfo),
        headers: new Headers(),
      });

      await getUserSession(validAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/session'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${validAccessToken}`,
          }),
        })
      );
    });

    it('should call correct backend endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSessionInfo),
        headers: new Headers(),
      });

      await getUserSession(validAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8080/auth/session',
        expect.any(Object)
      );
    });

    it('should use no-store cache policy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSessionInfo),
        headers: new Headers(),
      });

      await getUserSession(validAccessToken);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          cache: 'no-store',
        })
      );
    });

    it('should return SessionInfo with correct isEnabled value', async () => {
      const disabledSession: SessionInfo = { 
        ...mockSessionInfo, 
        isEnabled: false 
      };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(disabledSession),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);

      expect(result?.isEnabled).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should return null on 401 Unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Token expired'),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);

      expect(result).toBeNull();
    });

    it('should return null on 403 Forbidden', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Account disabled'),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);

      expect(result).toBeNull();
    });

    it('should return null on 404 Not Found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve('Profile not found'),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);

      expect(result).toBeNull();
    });

    it('should return null on 500 Internal Server Error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await getUserSession(validAccessToken);

      expect(result).toBeNull();
    });

    it('should return null on fetch timeout', async () => {
      mockFetch.mockRejectedValueOnce(new Error('AbortError: The operation was aborted.'));

      const result = await getUserSession(validAccessToken);

      expect(result).toBeNull();
    });
  });

  describe('input handling', () => {
    it('should handle empty access token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Missing token'),
        headers: new Headers(),
      });

      const result = await getUserSession('');

      expect(result).toBeNull();
    });
  });
});
```

---

## Unit Tests: AuthListener.tsx

**File**: `frontend/src/components/auth/AuthListener.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import AuthListener from './AuthListener';
import type { Session, User } from '@supabase/supabase-js';

// =============================================================================
// Mock Setup - Place at top level before imports are processed
// =============================================================================

// Mock getUserSession
const mockGetUserSession = vi.fn();
vi.mock('@/lib/auth/session-utils', () => ({
  getUserSession: mockGetUserSession,
}));

// Mock getDefaultRouteForUser
const mockGetDefaultRouteForUser = vi.fn();
vi.mock('@/lib/auth/role-utils', () => ({
  getDefaultRouteForUser: mockGetDefaultRouteForUser,
}));

// Mock Supabase client
const mockOnAuthStateChange = vi.fn();
const mockGetSession = vi.fn();
const mockSetSession = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: mockOnAuthStateChange,
      getSession: mockGetSession,
      setSession: mockSetSession,
    },
  },
}));

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
};

// Mock document.cookie
let mockCookie = '';

// =============================================================================
// Global Setup
// =============================================================================

describe('AuthListener', () => {
  let authStateCallback: ((event: string, session: Session | null) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset location mock
    mockLocation.href = '';
    mockLocation.pathname = '/login';
    mockLocation.search = '';
    mockLocation.hash = '';
    
    // Reset cookie mock
    mockCookie = '';
    
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
    });

    Object.defineProperty(document, 'cookie', {
      get: () => mockCookie,
      set: (value: string) => { mockCookie = value; },
      configurable: true,
    });

    // Mock window.history.replaceState
    vi.spyOn(window.history, 'replaceState').mockImplementation(() => {});

    // Setup onAuthStateChange to capture callback
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    // Default mock returns
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSetSession.mockResolvedValue({ data: { session: null }, error: null });
    mockGetUserSession.mockResolvedValue(null);
    mockGetDefaultRouteForUser.mockReturnValue('/dashboard');
  });

  afterEach(() => {
    authStateCallback = null;
  });

  // ===========================================================================
  // Cookie Management Tests
  // ===========================================================================

  describe('Cookie Management', () => {
    it('should set cookie on SIGNED_IN event', async () => {
      render(<AuthListener />);

      const session = createMockSession();
      mockGetUserSession.mockResolvedValue({
        isEnabled: true,
        role: 'user',
      });

      await act(async () => {
        authStateCallback?.('SIGNED_IN', session);
      });

      await waitFor(() => {
        expect(mockCookie).toContain('magazyn-auth-token=mock-access-token');
      });
    });

    it('should include correct cookie attributes', async () => {
      render(<AuthListener />);

      const session = createMockSession();
      mockGetUserSession.mockResolvedValue({
        isEnabled: true,
        role: 'user',
      });

      await act(async () => {
        authStateCallback?.('SIGNED_IN', session);
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
        authStateCallback?.('SIGNED_OUT', null);
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
      mockLocation.hash = '#access_token=hash-access-token&refresh_token=hash-refresh-token&expires_in=3600';
      
      const session = createMockSession({ access_token: 'hash-access-token' });
      mockSetSession.mockResolvedValue({ data: { session }, error: null });
      mockGetUserSession.mockResolvedValue({
        isEnabled: true,
        role: 'admin',
      });

      render(<AuthListener />);

      await waitFor(() => {
        expect(mockSetSession).toHaveBeenCalledWith({
          access_token: 'hash-access-token',
          refresh_token: 'hash-refresh-token',
        });
      });
    });

    it('should clean URL hash after processing', async () => {
      mockLocation.hash = '#access_token=token&refresh_token=refresh';
      
      const session = createMockSession();
      mockSetSession.mockResolvedValue({ data: { session }, error: null });
      mockGetUserSession.mockResolvedValue({
        isEnabled: true,
        role: 'user',
      });

      render(<AuthListener />);

      await waitFor(() => {
        expect(window.history.replaceState).toHaveBeenCalled();
      });
    });

    it('should not process hash without access_token', async () => {
      mockLocation.hash = '#some_other_param=value';

      render(<AuthListener />);

      // Wait a bit to ensure no processing happens
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockSetSession).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Redirect Logic Tests - Enabled Users
  // ===========================================================================

  describe('Redirect Logic - Enabled Users', () => {
    it('should redirect super_admin to /admin', async () => {
      render(<AuthListener />);

      const session = createMockSession();
      mockGetUserSession.mockResolvedValue({
        isEnabled: true,
        role: 'super_admin',
      });
      mockGetDefaultRouteForUser.mockReturnValue('/admin');

      await act(async () => {
        authStateCallback?.('SIGNED_IN', session);
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe('/admin');
      });
    });

    it('should redirect admin to /admin', async () => {
      render(<AuthListener />);

      const session = createMockSession();
      mockGetUserSession.mockResolvedValue({
        isEnabled: true,
        role: 'admin',
      });
      mockGetDefaultRouteForUser.mockReturnValue('/admin');

      await act(async () => {
        authStateCallback?.('SIGNED_IN', session);
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe('/admin');
      });
    });

    it('should redirect user to /dashboard', async () => {
      render(<AuthListener />);

      const session = createMockSession();
      mockGetUserSession.mockResolvedValue({
        isEnabled: true,
        role: 'user',
      });
      mockGetDefaultRouteForUser.mockReturnValue('/dashboard');

      await act(async () => {
        authStateCallback?.('SIGNED_IN', session);
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe('/dashboard');
      });
    });
  });

  // ===========================================================================
  // Redirect Logic Tests - Disabled Users
  // ===========================================================================

  describe('Redirect Logic - Disabled Users', () => {
    it('should redirect disabled user to /account-disabled', async () => {
      render(<AuthListener />);

      const session = createMockSession();
      mockGetUserSession.mockResolvedValue({
        isEnabled: false,
        role: 'super_admin',
      });
      mockGetDefaultRouteForUser.mockReturnValue('/account-disabled');

      await act(async () => {
        authStateCallback?.('SIGNED_IN', session);
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe('/account-disabled');
      });
    });

    it('should override redirect param when user is disabled', async () => {
      mockLocation.search = '?redirect=/dashboard';
      
      render(<AuthListener />);

      const session = createMockSession();
      mockGetUserSession.mockResolvedValue({
        isEnabled: false,
        role: 'user',
      });
      mockGetDefaultRouteForUser.mockReturnValue('/account-disabled');

      await act(async () => {
        authStateCallback?.('SIGNED_IN', session);
      });

      await waitFor(() => {
        expect(mockLocation.href).toBe('/account-disabled');
      });
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
      mockGetUserSession.mockResolvedValue({
        isEnabled: true,
        role: 'super_admin',
      });
      mockGetDefaultRouteForUser.mockReturnValue('/admin');

      const originalHref = mockLocation.href;

      await act(async () => {
        authStateCallback?.('SIGNED_IN', session);
      });

      // Wait and verify no redirect happened
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(mockLocation.href).toBe(originalHref);
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
        authStateCallback?.('SIGNED_OUT', null);
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
      mockOnAuthStateChange.mockReturnValue({
        data: {
          subscription: {
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
```

---

## Test Utilities & Mocks

### Supabase Mock Factory

**File**: `frontend/src/test/mocks/supabase.ts`

```typescript
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
```

### User Mock Factory

**File**: `frontend/src/test/mocks/user.ts`

```typescript
import type { User, Session } from '@supabase/supabase-js';
import type { SessionInfo } from '@/types';

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-id-12345',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

export const createMockSession = (overrides: Partial<Session> = {}): Session => ({
  access_token: 'mock-access-token-jwt',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user: createMockUser(),
  ...overrides,
});

export const createMockSessionInfo = (overrides: Partial<SessionInfo> = {}): SessionInfo => ({
  userId: 'test-user-id-12345',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
  creditBalance: 100,
  isEnabled: true,
  expiresAt: '2025-12-31T00:00:00Z',
  ...overrides,
});

// Prebuilt scenarios
export const mockUsers = {
  enabledSuperAdmin: createMockUser({
    user_metadata: { role: 'super_admin' },
  }),
  enabledAdmin: createMockUser({
    user_metadata: { role: 'admin' },
  }),
  enabledUser: createMockUser({
    user_metadata: { role: 'user' },
  }),
  disabledUser: createMockUser({
    user_metadata: { role: 'user' },
  }),
};

export const mockSessionInfos = {
  enabledSuperAdmin: createMockSessionInfo({ role: 'super_admin', isEnabled: true }),
  enabledAdmin: createMockSessionInfo({ role: 'admin', isEnabled: true }),
  enabledUser: createMockSessionInfo({ role: 'user', isEnabled: true }),
  disabledSuperAdmin: createMockSessionInfo({ role: 'super_admin', isEnabled: false }),
  disabledUser: createMockSessionInfo({ role: 'user', isEnabled: false }),
};
```

---

## Implementation Checklist

### Phase 1: Setup (1-2 hours)

- [ ] Install vitest dependencies: `npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom jsdom`
- [ ] Create `frontend/vitest.config.ts` 
- [ ] Create `frontend/src/test/setup.ts`
- [ ] Create `frontend/src/test/mocks/supabase.ts`
- [ ] Create `frontend/src/test/mocks/user.ts`
- [ ] Add test scripts to `package.json`
- [ ] Verify setup with `npm test`

### Phase 2: role-utils.ts Tests (1 hour)

- [ ] Create `frontend/src/lib/auth/role-utils.test.ts`
- [ ] Implement `getDefaultRouteForUser` tests (15 test cases)
- [ ] Implement `isAdmin` tests (5 test cases)
- [ ] Implement `isSuperAdmin` tests (4 test cases)
- [ ] Run tests: `npm test role-utils`

### Phase 3: session-utils.ts Tests (1-2 hours)

- [ ] Create `frontend/src/lib/auth/session-utils.test.ts`
- [ ] Implement successful response tests (5 test cases)
- [ ] Implement error handling tests (6 test cases)
- [ ] Implement input handling tests (1 test case)
- [ ] Run tests: `npm test session-utils`

### Phase 4: AuthListener.tsx Tests (2-3 hours)

- [ ] Create `frontend/src/components/auth/AuthListener.test.tsx`
- [ ] Implement cookie management tests (3 test cases)
- [ ] Implement magic link hash processing tests (3 test cases)
- [ ] Implement redirect logic tests - enabled users (3 test cases)
- [ ] Implement redirect logic tests - disabled users (2 test cases)
- [ ] Implement redirect prevention tests (1 test case)
- [ ] Implement SIGNED_OUT tests (1 test case)
- [ ] Implement cleanup tests (1 test case)
- [ ] Run tests: `npm test AuthListener`

### Phase 5: Verification

- [ ] Run all tests: `npm test`
- [ ] Check coverage: `npm run test:coverage`
- [ ] Fix any failing tests
- [ ] Remove debug console.logs from `session-utils.ts` if desired

---

## Coverage Goals

| File | Target Coverage |
|------|-----------------|
| `role-utils.ts` | 100% |
| `session-utils.ts` | ≥90% |
| `AuthListener.tsx` | ≥80% |

---

## References

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library React](https://testing-library.com/docs/react-testing-library/intro/)
- [Project Vitest Rules](file:///e:/bystrze/Magazyn/.agent/rules/vitest-unit-testing.md)
- [Fixed Issues Report](file:///e:/bystrze/Magazyn/.ai/loop/report.md)
