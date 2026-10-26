/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor, act } from "@testing-library/react";
import type { Session, AuthChangeEvent } from "@supabase/supabase-js";

vi.mock("@/lib/auth/session-utils", () => ({
  getUserSession: vi.fn(),
}));

vi.mock("@/lib/auth/redirect-manager", () => ({
  RedirectManager: {
    getRedirectForAuthState: vi.fn(),
    canRedirect: vi.fn(() => true),
    recordRedirect: vi.fn(),
    reset: vi.fn(),
  },
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(),
      getSession: vi.fn(),
      setSession: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/logout", () => ({
  handleLogout: vi.fn().mockResolvedValue(undefined),
}));

import { AuthListener } from "../AuthListener";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";
import { supabase } from "@/lib/supabase";
import { handleLogout } from "@/lib/auth/logout";
import { createMockSession, createMockUser } from "@/test/fixtures/auth-fixtures";

const mockLocation = {
  href: "",
  pathname: "/login",
  search: "",
  hash: "",
  origin: "http://localhost:4321",
  replace: vi.fn(),
};

describe("AuthListener", () => {
  let authStateCallback:
    ((event: AuthChangeEvent, session: Session | null) => Promise<void>) | null = null;
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockLocation.href = "";
    mockLocation.pathname = "/login";
    mockLocation.search = "";
    mockLocation.hash = "";
    mockLocation.replace = mockReplace;

    vi.stubGlobal("location", {
      ...mockLocation,
      replace: mockReplace,
    });

    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateCallback = callback as any;
      return {
        data: {
          subscription: {
            id: "test-subscription",
            callback: vi.fn(),
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
      error: null,
    });
    vi.mocked(supabase.auth.setSession).mockResolvedValue({
      data: { session: null, user: null },
      error: null,
    });
    vi.mocked(getUserSession).mockResolvedValue(null);

    vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue(null);
  });

  afterEach(() => {
    authStateCallback = null;
    vi.unstubAllGlobals();
  });

  describe("Cookie Management", () => {
    it("should handle SIGNED_IN event, fetch session, and trigger redirect", async () => {
      mockLocation.pathname = "/login";
      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        userId: "test-id",
        email: "test@test.com",
        username: "test",
        isEnabled: true,
        role: "user",
        creditBalance: 100,
        expiresAt: "2025-12-31T00:00:00Z",
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue("/dashboard");

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      await waitFor(() => {
        expect(getUserSession).toHaveBeenCalledWith("mock-access-token");
        expect(mockReplace).toHaveBeenCalledWith("/dashboard");
      });
    });
  });

  describe("Magic Link Hash Processing", () => {
    it("should detect and process access_token in URL hash and clean hash", async () => {
      mockLocation.hash =
        "#access_token=hash-access-token&refresh_token=hash-refresh-token&expires_in=3600";
      mockLocation.pathname = "/login";
      vi.stubGlobal("location", { ...mockLocation, replace: vi.fn() });

      const session = createMockSession({ access_token: "hash-access-token" });
      vi.mocked(supabase.auth.setSession).mockResolvedValue({
        data: { session, user: session.user },
        error: null,
      });
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: "admin",
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue("/admin");

      render(<AuthListener />);

      await waitFor(
        () => {
          expect(supabase.auth.setSession).toHaveBeenCalledWith({
            access_token: "hash-access-token",
            refresh_token: "hash-refresh-token",
          });
          expect(window.history.replaceState).toHaveBeenCalled();
        },
        { timeout: 2000 }
      );
    });

    it("should not process hash without access_token", async () => {
      mockLocation.hash = "#some_other_param=value";

      render(<AuthListener />);

      expect(supabase.auth.setSession).not.toHaveBeenCalled();
    });
  });

  describe("Redirect Prevention", () => {
    it("should not redirect if already on target page", async () => {
      mockLocation.pathname = "/admin";

      render(<AuthListener />);

      const session = createMockSession();
      vi.mocked(getUserSession).mockResolvedValue({
        isEnabled: true,
        role: "super_admin",
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue(null);

      act(() => {
        authStateCallback?.("SIGNED_IN", session);
      });

      await waitFor(() => {
        expect(mockReplace).not.toHaveBeenCalled();
      });
    });
  });

  describe("Client Session Identity Guard (R3)", () => {
    it("should allow standard behavior when initialUserId matches session.user.id", async () => {
      mockLocation.pathname = "/dashboard";
      vi.stubGlobal("location", { ...mockLocation, pathname: "/dashboard", replace: mockReplace });
      const session = createMockSession({
        user: createMockUser({ id: "user-123", email: "user@example.com" }),
      });

      vi.mocked(getUserSession).mockResolvedValue({
        userId: "user-123",
        email: "user@example.com",
        username: "testuser",
        isEnabled: true,
        role: "user",
        creditBalance: 100,
        expiresAt: "2025-12-31T00:00:00Z",
      } as any);

      render(<AuthListener initialUserId="user-123" />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      await waitFor(() => {
        expect(handleLogout).not.toHaveBeenCalled();
        expect(getUserSession).toHaveBeenCalledWith(session.access_token);
      });
    });

    it("should abort, log critical error, and call handleLogout when session.user.id !== initialUserId on authenticated route", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockLocation.pathname = "/dashboard";
      vi.stubGlobal("location", { ...mockLocation, pathname: "/dashboard", replace: mockReplace });
      const session = createMockSession({
        user: createMockUser({ id: "attacker-456", email: "attacker@example.com" }),
      });

      render(<AuthListener initialUserId="victim-123" />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      await waitFor(() => {
        expect(handleLogout).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "Critical session mismatch detected in AuthListener:",
          expect.objectContaining({
            initialUserId: "victim-123",
            sessionUserId: "attacker-456",
          })
        );
        expect(getUserSession).not.toHaveBeenCalled();
        expect(mockReplace).not.toHaveBeenCalled();
      });

      consoleErrorSpy.mockRestore();
    });

    it("should allow login flow without triggering logout abort on /login route even when session.user.id differs from initialUserId", async () => {
      mockLocation.pathname = "/login";
      const session = createMockSession({
        user: createMockUser({ id: "new-user-789", email: "new@example.com" }),
      });

      vi.mocked(getUserSession).mockResolvedValue({
        userId: "new-user-789",
        email: "new@example.com",
        username: "newuser",
        isEnabled: true,
        role: "user",
        creditBalance: 50,
        expiresAt: "2025-12-31T00:00:00Z",
      } as any);
      vi.mocked(RedirectManager.getRedirectForAuthState).mockReturnValue("/dashboard");

      render(<AuthListener initialUserId="old-user-123" />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      await waitFor(() => {
        expect(handleLogout).not.toHaveBeenCalled();
        expect(getUserSession).toHaveBeenCalledWith(session.access_token);
        expect(mockReplace).toHaveBeenCalledWith("/dashboard");
      });
    });

    it("should allow login flow on /login/ with trailing slash without triggering logout abort", async () => {
      mockLocation.pathname = "/login/";
      vi.stubGlobal("location", { ...mockLocation, pathname: "/login/", replace: mockReplace });
      const session = createMockSession({
        user: createMockUser({ id: "new-user-789", email: "new@example.com" }),
      });

      vi.mocked(getUserSession).mockResolvedValue({
        userId: "new-user-789",
        email: "new@example.com",
        username: "newuser",
        isEnabled: true,
        role: "user",
        creditBalance: 50,
        expiresAt: "2025-12-31T00:00:00Z",
      } as any);

      render(<AuthListener initialUserId="old-user-123" />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      await waitFor(() => {
        expect(handleLogout).not.toHaveBeenCalled();
        expect(getUserSession).toHaveBeenCalledWith(session.access_token);
      });
    });

    it("should not trigger logout abort when initialUserId is null or undefined (guest SSR session)", async () => {
      mockLocation.pathname = "/dashboard";
      vi.stubGlobal("location", { ...mockLocation, pathname: "/dashboard", replace: mockReplace });
      const session = createMockSession({
        user: createMockUser({ id: "guest-becoming-user-999", email: "guest@example.com" }),
      });

      vi.mocked(getUserSession).mockResolvedValue({
        userId: "guest-becoming-user-999",
        email: "guest@example.com",
        username: "guestuser",
        isEnabled: true,
        role: "user",
        creditBalance: 10,
        expiresAt: "2025-12-31T00:00:00Z",
      } as any);

      render(<AuthListener initialUserId={null} />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      await waitFor(() => {
        expect(handleLogout).not.toHaveBeenCalled();
        expect(getUserSession).toHaveBeenCalledWith(session.access_token);
      });
    });
  });

  describe("Cleanup", () => {
    it("should unsubscribe from auth state changes on unmount", () => {
      const mockUnsubscribe = vi.fn();
      vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
        data: {
          subscription: {
            id: "test",
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
