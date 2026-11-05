import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshUserSession, clearRefreshStateForTesting } from "../session-refresh";
import type { MagazynSession } from "../session-store";

describe("session-refresh (Single-flight & Grace cache)", () => {
  let mockRefreshSession: ReturnType<typeof vi.fn>;
  let mockSupabase: SupabaseClient;

  const baseSession: MagazynSession = {
    userId: "user-123",
    accessToken: "old-access-token",
    refreshToken: "old-refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) - 100, // expired
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearRefreshStateForTesting();

    mockRefreshSession = vi.fn();
    mockSupabase = {
      auth: {
        refreshSession: mockRefreshSession,
      },
    } as unknown as SupabaseClient;
  });

  it("successfully refreshes session and returns new tokens", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_at: 1800000000,
        },
      },
      error: null,
    });

    const result = await refreshUserSession(baseSession, mockSupabase);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.session.accessToken).toBe("new-access-token");
      expect(result.session.refreshToken).toBe("new-refresh-token");
      expect(result.session.expiresAt).toBe(1800000000);
      expect(result.session.userId).toBe("user-123");
    }
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockRefreshSession).toHaveBeenCalledWith({
      refresh_token: "old-refresh-token",
    });
  });

  it("deduplicates concurrent refresh requests for the same user", async () => {
    let resolveRefresh: (val: unknown) => void = () => {};
    const deferredPromise = new Promise((resolve) => {
      resolveRefresh = resolve;
    });

    mockRefreshSession.mockReturnValueOnce(deferredPromise);

    const call1 = refreshUserSession(baseSession, mockSupabase);
    const call2 = refreshUserSession(baseSession, mockSupabase);
    const call3 = refreshUserSession(baseSession, mockSupabase);

    resolveRefresh({
      data: {
        session: {
          access_token: "concurrent-access-token",
          refresh_token: "concurrent-refresh-token",
          expires_at: 1900000000,
        },
      },
      error: null,
    });

    const [res1, res2, res3] = await Promise.all([call1, call2, call3]);

    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res3.success).toBe(true);
    if (res1.success && res2.success && res3.success) {
      expect(res1.session.accessToken).toBe("concurrent-access-token");
      expect(res2.session.accessToken).toBe("concurrent-access-token");
      expect(res3.session.accessToken).toBe("concurrent-access-token");
    }
  });

  it("permits independent concurrent refreshes for different devices with different tokens", async () => {
    const sessionDeviceA: MagazynSession = {
      ...baseSession,
      refreshToken: "token-device-a",
    };
    const sessionDeviceB: MagazynSession = {
      ...baseSession,
      refreshToken: "token-device-b",
    };

    mockRefreshSession
      .mockResolvedValueOnce({
        data: {
          session: {
            access_token: "access-device-a",
            refresh_token: "rotated-device-a",
            expires_at: 1900000000,
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          session: {
            access_token: "access-device-b",
            refresh_token: "rotated-device-b",
            expires_at: 1900000000,
          },
        },
        error: null,
      });

    const [resA, resB] = await Promise.all([
      refreshUserSession(sessionDeviceA, mockSupabase),
      refreshUserSession(sessionDeviceB, mockSupabase),
    ]);

    expect(mockRefreshSession).toHaveBeenCalledTimes(2);
    expect(resA.success).toBe(true);
    expect(resB.success).toBe(true);
    if (resA.success && resB.success) {
      expect(resA.session.refreshToken).toBe("rotated-device-a");
      expect(resB.session.refreshToken).toBe("rotated-device-b");
    }
  });

  it("serves subsequent requests with old refresh token from grace cache", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: {
        session: {
          access_token: "cached-access-token",
          refresh_token: "cached-refresh-token",
          expires_at: 1950000000,
        },
      },
      error: null,
    });

    // Initial request that rotates the token
    const firstResult = await refreshUserSession(baseSession, mockSupabase);
    expect(firstResult.success).toBe(true);
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);

    // Lagging concurrent request arriving right after first completed, carrying the old token
    const laggingResult = await refreshUserSession(baseSession, mockSupabase);
    expect(laggingResult.success).toBe(true);
    if (laggingResult.success) {
      expect(laggingResult.session.accessToken).toBe("cached-access-token");
      expect(laggingResult.session.refreshToken).toBe("cached-refresh-token");
    }

    // Should NOT have called Supabase again
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
  });

  it("marks isRevoked true when Supabase returns 400 invalid_grant or revoked", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Invalid Refresh Token: Refresh Token Not Found", status: 400 },
    });

    const result = await refreshUserSession(baseSession, mockSupabase);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.isRevoked).toBe(true);
    }
  });

  it("marks isRevoked false when Supabase returns a transient 500 error", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Internal server error", status: 500 },
    });

    const result = await refreshUserSession(baseSession, mockSupabase);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.isRevoked).toBe(false);
    }
  });

  it("marks isRevoked false when Supabase returns 429 Too Many Requests (rate limit)", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Too many requests", status: 429 },
    });

    const result = await refreshUserSession(baseSession, mockSupabase);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.isRevoked).toBe(false);
    }
  });

  it("marks isRevoked false when Supabase returns 408 Request Timeout", async () => {
    mockRefreshSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: "Request timeout", status: 408 },
    });

    const result = await refreshUserSession(baseSession, mockSupabase);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.isRevoked).toBe(false);
    }
  });
});
