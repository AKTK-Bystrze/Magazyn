import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AstroCookies } from "astro";

// Hoisted mocks for modules consumed by the middleware
const mocks = vi.hoisted(() => ({
  decryptSession: vi.fn(),
  encryptSession: vi.fn(),
  getUserSession: vi.fn(),
  refreshSession: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mocks.createClient(...args),
}));

vi.mock("@/lib/auth/session-store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/session-store")>();
  return {
    ...actual,
    decryptSession: (...args: unknown[]) => mocks.decryptSession(...args),
    encryptSession: (...args: unknown[]) => mocks.encryptSession(...args),
    SESSION_COOKIE: "magazyn_sid",
    SESSION_COOKIE_OPTIONS: {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 2592000,
    },
  };
});

vi.mock("@/lib/auth/session-utils", () => ({
  getUserSession: (...args: unknown[]) => mocks.getUserSession(...args),
}));

import { clearRefreshStateForTesting } from "@/lib/auth/session-refresh";

// Import middleware under test
import { onRequest } from "../index";

type NextFn = Parameters<typeof onRequest>[1];

describe("Astro Middleware (onRequest) — HttpOnly session", () => {
  let mockCookies: AstroCookies;
  let nextMock: ReturnType<typeof vi.fn>;

  function createMockContext(
    urlPath: string,
    options?: { headers?: Record<string, string>; cookieValue?: string | null }
  ) {
    const fullUrl = `http://localhost:3000${urlPath}`;
    const headers = new Headers(options?.headers || {});
    const request = new Request(fullUrl, { headers });

    const redirectMock = vi.fn((destination: string) => {
      return new Response(null, {
        status: 302,
        headers: { Location: destination },
      });
    });

    const locals: Record<string, unknown> = {};

    return {
      context: {
        request,
        cookies: mockCookies,
        locals,
        redirect: redirectMock,
        url: new URL(fullUrl),
      } as unknown as Parameters<typeof onRequest>[0],
      redirectMock,
    };
  }

  /**
   * Runs the middleware with a mocked `next` callback and returns the Response.
   * The middleware returns `void | Response`; in practice it always returns a
   * Response when a redirect/error occurs, otherwise it delegates to `next()`.
   */
  async function runMiddleware(
    context: Parameters<typeof onRequest>[0],
    next: ReturnType<typeof vi.fn>
  ): Promise<Response> {
    const result = await onRequest(context, next as unknown as NextFn);
    return result as Response;
  }

  const mockSession = {
    userId: "user-123",
    accessToken: "access-token-1",
    refreshToken: "refresh-token-1",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
  };

  const mockSessionInfo = {
    userId: "user-123",
    email: "user@example.com",
    username: "testuser",
    role: "user",
    creditBalance: 100,
    isEnabled: true,
    expiresAt: "2026-12-31T00:00:00Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearRefreshStateForTesting();

    mocks.getUserSession.mockImplementation(async () => ({
      status: "ok",
      sessionInfo: mockSessionInfo,
    }));

    mockCookies = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    } as unknown as AstroCookies;

    mocks.createClient.mockReturnValue({
      auth: { refreshSession: mocks.refreshSession },
    });
    mocks.encryptSession.mockResolvedValue("encrypted-cookie-value");
    nextMock = vi.fn().mockResolvedValue(new Response("Next handler output", { status: 200 }));
  });

  describe("Unauthenticated requests", () => {
    it("redirects to login when no session cookie is present on a protected page", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      mocks.decryptSession.mockResolvedValue(null);

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(mocks.decryptSession).not.toHaveBeenCalled();
      expect(context.locals.user).toBeNull();
      expect(context.locals.sessionInfo).toBeNull();
      expect(context.locals.accessToken).toBeNull();
      expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(302);
    });

    it("treats a tampered/corrupt cookie as unauthenticated", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({ value: "tampered" });
      mocks.decryptSession.mockResolvedValue(null);

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(mocks.decryptSession).toHaveBeenCalledWith("tampered");
      expect(context.locals.user).toBeNull();
      expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
      expect(response.status).toBe(302);
    });
  });

  describe("Authenticated happy path", () => {
    it("decrypts the session, fetches session info, and populates locals", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(mockSession);
      mocks.getUserSession.mockResolvedValue({ status: "ok", sessionInfo: mockSessionInfo });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(mocks.decryptSession).toHaveBeenCalledWith("encrypted-cookie-value");
      expect(mocks.getUserSession).toHaveBeenCalledWith("access-token-1");
      expect(context.locals.user).toEqual({ id: "user-123", email: "user@example.com" });
      expect(context.locals.accessToken).toBe("access-token-1");
      expect(context.locals.sessionInfo).toEqual(mockSessionInfo);
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "private, no-cache, no-store, must-revalidate, max-age=0"
      );
      expect(response.headers.get("Pragma")).toBe("no-cache");
    });

    it("does not refresh when the access token is far from expiry", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(mockSession);
      mocks.getUserSession.mockResolvedValue({ status: "ok", sessionInfo: mockSessionInfo });

      const { context } = createMockContext("/dashboard");
      await runMiddleware(context, nextMock);

      expect(mocks.createClient).not.toHaveBeenCalled();
      expect(mocks.refreshSession).not.toHaveBeenCalled();
      expect(mockCookies.set).not.toHaveBeenCalled();
    });

    it("clears auth cookies and treats user as unauthenticated when session-info fetch fails", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(mockSession);
      mocks.getUserSession.mockResolvedValue({ status: "unauthorized" });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(mockCookies.delete).toHaveBeenCalledWith("magazyn_sid", { path: "/" });
      expect(context.locals.user).toBeNull();
      expect(context.locals.sessionInfo).toBeNull();
      expect(context.locals.accessToken).toBeNull();
      expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(302);
    });

    it("preserves auth cookies and returns 503 when backend session check is temporarily unavailable", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(mockSession);
      mocks.getUserSession.mockResolvedValue({
        status: "unavailable",
        error: "502 Bad Gateway",
      });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(mockCookies.delete).not.toHaveBeenCalled();
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(503);
      expect(await response.text()).toContain("Serwer jest chwilowo niedostępny");
    });
  });

  describe("Server-side token refresh", () => {
    it("refreshes near-expiry tokens and rewrites the cookie", async () => {
      const nearExpirySession = {
        ...mockSession,
        expiresAt: Math.floor(Date.now() / 1000) + 30,
      };
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(nearExpirySession);
      mocks.refreshSession.mockResolvedValue({
        data: {
          session: {
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_at: Math.floor(Date.now() / 1000) + 3600,
          },
        },
        error: null,
      });
      mocks.getUserSession.mockResolvedValue({ status: "ok", sessionInfo: mockSessionInfo });

      const { context } = createMockContext("/dashboard");
      await runMiddleware(context, nextMock);

      expect(mocks.createClient).toHaveBeenCalledTimes(1);
      expect(mocks.createClient.mock.calls[0][2]).toEqual({
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      expect(mocks.refreshSession).toHaveBeenCalledWith({
        refresh_token: "refresh-token-1",
      });
      expect(mocks.encryptSession).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: "new-access-token",
          refreshToken: "new-refresh-token",
        })
      );
      expect(mockCookies.set).toHaveBeenCalledWith(
        "magazyn_sid",
        "encrypted-cookie-value",
        expect.objectContaining({ httpOnly: true, sameSite: "lax" })
      );
      expect(context.locals.accessToken).toBe("new-access-token");
      expect(nextMock).toHaveBeenCalledTimes(1);
    });

    it("clears the session cookie when the refresh token is expired or revoked", async () => {
      const nearExpirySession = {
        ...mockSession,
        expiresAt: Math.floor(Date.now() / 1000) + 30,
      };
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(nearExpirySession);
      mocks.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "refresh_token_not_found" },
      });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(mockCookies.delete).toHaveBeenCalledWith("magazyn_sid", { path: "/" });
      expect(context.locals.user).toBeNull();
      expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(302);
    });

    it("keeps the session when the refresh fails transiently (timeout / 5xx)", async () => {
      const nearExpirySession = {
        ...mockSession,
        expiresAt: Math.floor(Date.now() / 1000) + 30,
      };
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(nearExpirySession);
      mocks.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "timed out", status: 500 },
      });
      mocks.getUserSession.mockResolvedValue({ status: "ok", sessionInfo: mockSessionInfo });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(mockCookies.delete).not.toHaveBeenCalled();
      expect(context.locals.user).toEqual({ id: "user-123", email: "user@example.com" });
      expect(context.locals.accessToken).toBe("access-token-1");
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBe(
        "private, no-cache, no-store, must-revalidate, max-age=0"
      );
      expect(response.headers.get("Pragma")).toBe("no-cache");
    });

    it("returns 503 and preserves session cookie when token is already expired and refresh fails transiently", async () => {
      const expiredSession = {
        ...mockSession,
        expiresAt: Math.floor(Date.now() / 1000) - 300, // expired 5 minutes ago
      };
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(expiredSession);
      mocks.refreshSession.mockResolvedValue({
        data: { session: null },
        error: { message: "Supabase timeout", status: 504 },
      });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(mockCookies.delete).not.toHaveBeenCalled();
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(503);
      expect(await response.text()).toContain("Usługa logowania jest tymczasowo niedostępna");
    });

    it("deduplicates concurrent refresh requests and rewrites cookies for all callers", async () => {
      const nearExpirySession = {
        ...mockSession,
        expiresAt: Math.floor(Date.now() / 1000) + 30,
      };
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(nearExpirySession);

      mocks.refreshSession.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          data: {
            session: {
              access_token: "rotated-access-token",
              refresh_token: "rotated-refresh-token",
              expires_at: Math.floor(Date.now() / 1000) + 3600,
            },
          },
          error: null,
        };
      });
      mocks.getUserSession.mockResolvedValue({ status: "ok", sessionInfo: mockSessionInfo });

      const ctx1 = createMockContext("/dashboard");
      const ctx2 = createMockContext("/api/credits");

      const [res1, res2] = await Promise.all([
        runMiddleware(ctx1.context, nextMock),
        runMiddleware(ctx2.context, nextMock),
      ]);

      expect(mocks.refreshSession).toHaveBeenCalledTimes(1);
      expect(mockCookies.delete).not.toHaveBeenCalled();
      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });
  });

  describe("API route auth enforcement", () => {
    it("returns 401 JSON for API routes without an authenticated session", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      mocks.decryptSession.mockResolvedValue(null);

      const { context, redirectMock } = createMockContext("/api/reservations");
      const response = await runMiddleware(context, nextMock);

      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toContain("Authentication required");
    });

    it("returns 403 JSON when a disabled user calls an API route", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(mockSession);
      mocks.getUserSession.mockResolvedValue({
        status: "ok",
        sessionInfo: { ...mockSessionInfo, isEnabled: false },
      });

      const { context, redirectMock } = createMockContext("/api/reservations");
      const response = await runMiddleware(context, nextMock);

      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error).toContain("Account is disabled");
    });
  });

  describe("Account disabled enforcement (page routes)", () => {
    it("redirects a disabled user to /account-disabled", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue({
        value: "encrypted-cookie-value",
      });
      mocks.decryptSession.mockResolvedValue(mockSession);
      mocks.getUserSession.mockResolvedValue({
        status: "ok",
        sessionInfo: { ...mockSessionInfo, isEnabled: false },
      });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await runMiddleware(context, nextMock);

      expect(redirectMock).toHaveBeenCalledWith("/account-disabled");
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(302);
    });
  });

  describe("Static assets bypass", () => {
    it("passes static assets directly to next() without auth checks", async () => {
      (mockCookies.get as ReturnType<typeof vi.fn>).mockReturnValue(undefined);
      mocks.decryptSession.mockResolvedValue(null);

      const { context, redirectMock } = createMockContext("/assets/styles.css");
      const response = await runMiddleware(context, nextMock);

      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
      expect(response.headers.get("Cache-Control")).toBeNull();
      expect(response.headers.get("Pragma")).toBeNull();
    });
  });
});
