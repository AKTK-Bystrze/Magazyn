import { describe, it, expect, beforeEach, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { setAuthCookie, hasAuthCookie } from "@/lib/auth/cookie-utils";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";
import { isSafeRedirect } from "@/lib/auth/url-utils";
import type { SessionInfo } from "@/types";

/**
 * Simple Integration Tests
 *
 * Purpose: Verify that auth utilities work together correctly
 * Scope: Minimal mocking, focus on module integration
 *
 * Note: This is NOT a replacement for unit tests. These tests verify
 * that the modules integrate properly with each other.
 */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Auth Integration Tests", () => {
  let mockCookie = "";

  beforeEach(() => {
    vi.clearAllMocks();
    mockCookie = "";

    Object.defineProperty(document, "cookie", {
      get: () => mockCookie,
      set: (value: string) => {
        if (value.includes("max-age=0")) {
          const cookieName = value.split("=")[0];
          mockCookie = mockCookie
            .split("; ")
            .filter((c) => !c.startsWith(cookieName))
            .join("; ");
        } else {
          mockCookie = value;
        }
      },
      configurable: true,
    });
  });

  describe("Login Flow Integration", () => {
    it("completes full login flow: session fetch → cookie set → redirect decision", async () => {
      const mockSession: SessionInfo = {
        userId: "user-123",
        email: "test@example.com",
        username: "testuser",
        role: "user",
        isEnabled: true,
        creditBalance: 100,
        expiresAt: "2025-12-31T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSession),
        headers: new Headers(),
      });

      const session = await getUserSession("mock-access-token");
      expect(session).toEqual(mockSession);

      setAuthCookie("mock-access-token");
      expect(hasAuthCookie()).toBe(true);

      const mockUser = { id: "user-123", email: "test@example.com" } as unknown as User;
      const redirect = RedirectManager.getRedirectForAuthState(
        mockUser,
        session,
        "/login",
        null,
        "http://localhost:4321"
      );

      expect(redirect).toBe("/dashboard");
      expect(isSafeRedirect(redirect!, "http://localhost:4321")).toBe(true);
    });

    it("handles disabled user flow: session fetch → redirect to account-disabled", async () => {
      const disabledSession: SessionInfo = {
        userId: "user-456",
        email: "disabled@example.com",
        username: "disableduser",
        role: "user",
        isEnabled: false,
        creditBalance: 0,
        expiresAt: "2025-12-31T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(disabledSession),
        headers: new Headers(),
      });

      const session = await getUserSession("mock-token");
      expect(session?.isEnabled).toBe(false);

      const mockUser = { id: "user-456", email: "disabled@example.com" } as unknown as User;
      const redirect = RedirectManager.getRedirectForAuthState(
        mockUser,
        session,
        "/dashboard",
        null,
        "http://localhost:4321"
      );

      expect(redirect).toBe("/account-disabled");
    });

    it("handles admin flow: session fetch → redirect to admin page", async () => {
      const adminSession: SessionInfo = {
        userId: "admin-789",
        email: "admin@example.com",
        username: "admin",
        role: "super_admin",
        isEnabled: true,
        creditBalance: 1000,
        expiresAt: "2025-12-31T00:00:00Z",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(adminSession),
        headers: new Headers(),
      });

      const session = await getUserSession("admin-token");
      expect(session?.role).toBe("super_admin");

      setAuthCookie("admin-token");

      const mockUser = { id: "admin-789", email: "admin@example.com" } as unknown as User;
      const redirect = RedirectManager.getRedirectForAuthState(
        mockUser,
        session,
        "/login",
        null,
        "http://localhost:4321"
      );

      expect(redirect).toBe("/admin");
      expect(hasAuthCookie()).toBe(true);
    });
  });

  describe("Security Integration", () => {
    it("rejects external redirect even with valid session", async () => {
      const validSession: SessionInfo = {
        userId: "user-123",
        email: "test@example.com",
        username: "testuser",
        role: "user",
        isEnabled: true,
        creditBalance: 100,
        expiresAt: "2025-12-31T00:00:00Z",
      };

      const maliciousRedirect = "https://evil.com/steal-data";

      expect(isSafeRedirect(maliciousRedirect, "http://localhost:4321")).toBe(false);

      const mockUser = { id: "user-123", email: "test@example.com" } as unknown as User;
      const redirect = RedirectManager.getRedirectForAuthState(
        mockUser,
        validSession,
        "/login",
        maliciousRedirect, // Malicious redirect param
        "http://localhost:4321"
      );

      expect(redirect).toBe("/dashboard");
    });
  });
});
