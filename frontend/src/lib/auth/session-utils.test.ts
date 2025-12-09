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
        isEnabled: false,
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
