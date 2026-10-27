import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AstroCookies } from "astro";

// Mock supabase-ssr
const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockSupabaseClient = {
  auth: {
    getUser: mockGetUser,
    getSession: mockGetSession,
  },
};

vi.mock("../../lib/auth/supabase-ssr", () => ({
  createSupabaseServerClient: vi.fn(() => mockSupabaseClient),
}));

// Mock cookie-utils
const mockClearAllAuthCookies = vi.fn();
vi.mock("../../lib/auth/cookie-utils", () => ({
  clearAllAuthCookies: (...args: unknown[]) => mockClearAllAuthCookies(...args),
}));

// Mock session-utils
const mockGetUserSession = vi.fn();
vi.mock("../../lib/auth/session-utils", () => ({
  getUserSession: (...args: unknown[]) => mockGetUserSession(...args),
}));

// Import middleware under test
import { onRequest } from "../index";

describe("Astro Middleware (onRequest)", () => {
  let mockCookies: AstroCookies;
  let nextMock: ReturnType<typeof vi.fn>;

  function createMockContext(urlPath: string, options?: { headers?: Record<string, string> }) {
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

  beforeEach(() => {
    vi.clearAllMocks();

    mockCookies = {
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      has: vi.fn(),
    } as unknown as AstroCookies;

    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
    nextMock = vi.fn().mockResolvedValue(new Response("Next handler output", { status: 200 }));
  });

  describe("Authenticated Happy Path", () => {
    it("authenticates valid user and populates locals before calling next()", async () => {
      const mockUser = { id: "user-123", email: "user@example.com" };
      const mockSessionInfo = {
        userId: "user-123",
        role: "user",
        isEnabled: true,
        username: "testuser",
        email: "user@example.com",
        creditBalance: 100,
        expiresAt: "2026-12-31T00:00:00Z",
      };

      mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: "mock-jwt-token" } },
        error: null,
      });
      mockGetUserSession.mockResolvedValueOnce(mockSessionInfo);

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await onRequest(context, nextMock);

      expect(mockGetUser).toHaveBeenCalledTimes(1);
      expect(mockGetSession).toHaveBeenCalledTimes(1);
      expect(mockGetUserSession).toHaveBeenCalledWith("mock-jwt-token");
      expect(context.locals.user).toEqual(mockUser);
      expect(context.locals.sessionInfo).toEqual(mockSessionInfo);
      expect(context.locals.accessToken).toBe("mock-jwt-token");
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
    });
  });

  describe("Unauthenticated User Page Navigation", () => {
    it("redirects unauthenticated user from protected page to /login preserving deep link", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await onRequest(context, nextMock);

      expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(302);
      expect(response.headers.get("Location")).toBe("/login?redirect=%2Fdashboard");
    });

    it("allows unauthenticated user to access /login without redirect", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const { context, redirectMock } = createMockContext("/login");
      const response = await onRequest(context, nextMock);

      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
    });
  });

  describe("Invalid Refresh Token Handling", () => {
    it("clears cookies and redirects protected page to /login with redirect parameter", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code: "refresh_token_not_found", message: "Token not found" },
      });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
      expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
      expect(response.status).toBe(302);
      expect(nextMock).not.toHaveBeenCalled();
    });

    it("clears cookies and renders /login directly without self-redirect loop", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code: "refresh_token_not_found", message: "Token not found" },
      });

      const { context, redirectMock } = createMockContext("/login");
      const response = await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
    });

    it("clears cookies on /api/auth/login and allows request to proceed to route handler", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code: "refresh_token_not_found", message: "Token not found" },
      });

      const { context, redirectMock } = createMockContext("/api/auth/login");
      const response = await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
    });

    it("clears cookies on non-auth API /api/reservations and returns 401 JSON error", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code: "refresh_token_not_found", message: "Token not found" },
      });

      const { context, redirectMock } = createMockContext("/api/reservations");
      const response = await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(401);

      const json = await response.json();
      expect(json.error).toBe("Authentication required");
    });

    it("clears cookies when error code is invalid_grant", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code: "invalid_grant", message: "Invalid refresh token" },
      });

      const { context } = createMockContext("/dashboard");
      await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
    });

    it("clears cookies when error code is session_not_found", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code: "session_not_found", message: "Session expired" },
      });

      const { context } = createMockContext("/dashboard");
      await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
    });

    it("clears cookies when error code is user_not_found", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code: "user_not_found", message: "User deleted" },
      });

      const { context } = createMockContext("/dashboard");
      await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
    });

    it("clears cookies when error code is bad_jwt or invalid_token", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { code: "bad_jwt", message: "Malformed token signature" },
      });

      const { context } = createMockContext("/dashboard");
      await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
    });

    it("clears cookies when error has a 4xx status (e.g. 400 bad request)", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: { status: 400, message: "Corrupted cookie chunk header" },
      });

      const { context } = createMockContext("/dashboard");
      await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).toHaveBeenCalledWith(context.request, mockCookies);
    });
  });

  describe("Guest Visitor / AuthSessionMissing Handling", () => {
    it("does not clear cookies or log an error when AuthSessionMissingError occurs, redirecting protected page to /login", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: {
          name: "AuthSessionMissingError",
          message: "Auth session missing!",
          status: 400,
        },
      });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(302);

      consoleErrorSpy.mockRestore();
    });

    it("does not clear cookies or log an error when AuthSessionMissingError occurs on public route /login", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: {
          name: "AuthSessionMissingError",
          message: "Auth session missing!",
          status: 400,
        },
      });

      const { context, redirectMock } = createMockContext("/login");
      const response = await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);

      consoleErrorSpy.mockRestore();
    });

    it("does not clear cookies or log an error when error has message 'Auth session missing!' without the exact error name", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: {
          name: "CustomError",
          message: "Auth session missing!",
          status: 400,
        },
      });

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await onRequest(context, nextMock);

      expect(mockClearAllAuthCookies).not.toHaveBeenCalled();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(redirectMock).toHaveBeenCalledWith("/login?redirect=%2Fdashboard");
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(302);

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Account Disabled Enforcement", () => {
    it("returns 403 Forbidden JSON when disabled user calls API route", async () => {
      const mockUser = { id: "disabled-user", email: "disabled@example.com" };
      const mockDisabledSession = {
        userId: "disabled-user",
        role: "user",
        isEnabled: false,
        username: "disableduser",
        email: "disabled@example.com",
        creditBalance: 0,
        expiresAt: "2026-12-31T00:00:00Z",
      };

      mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: "disabled-token" } },
        error: null,
      });
      mockGetUserSession.mockResolvedValueOnce(mockDisabledSession);

      const { context, redirectMock } = createMockContext("/api/reservations");
      const response = await onRequest(context, nextMock);

      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const json = await response.json();
      expect(json.error).toContain("Account is disabled");
    });

    it("redirects disabled user to /account-disabled when accessing page route", async () => {
      const mockUser = { id: "disabled-user", email: "disabled@example.com" };
      const mockDisabledSession = {
        userId: "disabled-user",
        role: "user",
        isEnabled: false,
        username: "disableduser",
        email: "disabled@example.com",
        creditBalance: 0,
        expiresAt: "2026-12-31T00:00:00Z",
      };

      mockGetUser.mockResolvedValueOnce({ data: { user: mockUser }, error: null });
      mockGetSession.mockResolvedValueOnce({
        data: { session: { access_token: "disabled-token" } },
        error: null,
      });
      mockGetUserSession.mockResolvedValueOnce(mockDisabledSession);

      const { context, redirectMock } = createMockContext("/dashboard");
      const response = await onRequest(context, nextMock);

      expect(redirectMock).toHaveBeenCalledWith("/account-disabled");
      expect(nextMock).not.toHaveBeenCalled();
      expect(response.status).toBe(302);
    });
  });

  describe("Static Assets Bypass", () => {
    it("passes static assets directly to next() without auth check or redirect", async () => {
      const { context, redirectMock } = createMockContext("/assets/styles.css");
      const response = await onRequest(context, nextMock);

      expect(redirectMock).not.toHaveBeenCalled();
      expect(nextMock).toHaveBeenCalledTimes(1);
      expect(response.status).toBe(200);
    });
  });
});
