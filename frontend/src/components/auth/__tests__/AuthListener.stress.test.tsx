/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
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
      signOut: vi.fn().mockResolvedValue({ error: null }),
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

describe("AuthListener Adversarial & Stress Suite (Challenger 2)", () => {
  let authStateCallback:
    ((event: AuthChangeEvent, session: Session | null) => Promise<void>) | null = null;
  const mockReplace = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.stubGlobal("location", {
      href: "http://localhost:4321/dashboard",
      pathname: "/dashboard",
      search: "",
      hash: "",
      origin: "http://localhost:4321",
      replace: mockReplace,
    });

    vi.spyOn(window.history, "replaceState").mockImplementation(() => {});

    vi.mocked(supabase.auth.onAuthStateChange).mockImplementation((callback) => {
      authStateCallback = callback as any;
      return {
        data: {
          subscription: {
            id: "stress-subscription",
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

  describe("Stress Dimension 1: Route Edge Cases & Trailing Slashes", () => {
    const routeScenarios = [
      {
        name: "Standard /login route with mismatched session",
        pathname: "/login",
        shouldEvict: false,
      },
      {
        name: "Trailing slash /login/ with mismatched session",
        pathname: "/login/",
        shouldEvict: false,
      },
      {
        name: "Protected root / with mismatched session",
        pathname: "/",
        shouldEvict: true,
      },
      {
        name: "Protected /admin with mismatched session",
        pathname: "/admin",
        shouldEvict: true,
      },
      {
        name: "Protected /admin/ with trailing slash",
        pathname: "/admin/",
        shouldEvict: true,
      },
      {
        name: "Protected /admin/users nested route",
        pathname: "/admin/users",
        shouldEvict: true,
      },
      {
        name: "Public /equipment route with mismatched session",
        pathname: "/equipment",
        shouldEvict: true,
      },
      {
        name: "Pseudo-login subpath /login/callback (not exempt)",
        pathname: "/login/callback",
        shouldEvict: true,
      },
      {
        name: "Pseudo-login subpath /admin/login (not exempt)",
        pathname: "/admin/login",
        shouldEvict: true,
      },
    ];

    routeScenarios.forEach(({ name, pathname, shouldEvict }) => {
      it(name, async () => {
        vi.stubGlobal("location", {
          href: `http://localhost:4321${pathname}`,
          pathname,
          search: "",
          hash: "",
          origin: "http://localhost:4321",
          replace: mockReplace,
        });

        const session = createMockSession({
          user: createMockUser({ id: "intruder-999", email: "intruder@example.com" }),
        });

        render(<AuthListener initialUserId="victim-001" />);

        await act(async () => {
          await authStateCallback?.("SIGNED_IN", session);
        });

        if (shouldEvict) {
          expect(handleLogout).toHaveBeenCalledTimes(1);
          expect(mockReplace).not.toHaveBeenCalled();
          expect(getUserSession).not.toHaveBeenCalled();
        } else {
          expect(handleLogout).not.toHaveBeenCalled();
        }
      });
    });
  });

  describe("Stress Dimension 2: InitialUserId Nullability & Boundary States", () => {
    it("null initialUserId on /dashboard does NOT trigger logout abort (guest SSR)", async () => {
      vi.stubGlobal("location", {
        href: "http://localhost:4321/dashboard",
        pathname: "/dashboard",
        search: "",
        hash: "",
        origin: "http://localhost:4321",
        replace: mockReplace,
      });

      const session = createMockSession({
        user: createMockUser({ id: "user-123", email: "user@example.com" }),
      });

      render(<AuthListener initialUserId={null} />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      expect(handleLogout).not.toHaveBeenCalled();
    });

    it("undefined initialUserId on /login does NOT trigger logout abort", async () => {
      vi.stubGlobal("location", {
        href: "http://localhost:4321/login",
        pathname: "/login",
        search: "",
        hash: "",
        origin: "http://localhost:4321",
        replace: mockReplace,
      });

      const session = createMockSession({
        user: createMockUser({ id: "user-123", email: "user@example.com" }),
      });

      render(<AuthListener initialUserId={undefined} />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      expect(handleLogout).not.toHaveBeenCalled();
    });

    it("empty string initialUserId ('') is treated as falsy and does NOT trigger logout abort", async () => {
      vi.stubGlobal("location", {
        href: "http://localhost:4321/dashboard",
        pathname: "/dashboard",
        search: "",
        hash: "",
        origin: "http://localhost:4321",
        replace: mockReplace,
      });

      const session = createMockSession({
        user: createMockUser({ id: "user-123", email: "user@example.com" }),
      });

      render(<AuthListener initialUserId="" />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      expect(handleLogout).not.toHaveBeenCalled();
    });
  });

  describe("Stress Dimension 3: Query Parameters and Fragment Variations", () => {
    it("handles complex search params on /login (?redirect=%2Fadmin&ref=email#none) without false eviction", async () => {
      vi.stubGlobal("location", {
        href: "http://localhost:4321/login?redirect=%2Fadmin&ref=email#none",
        pathname: "/login",
        search: "?redirect=%2Fadmin&ref=email",
        hash: "#none",
        origin: "http://localhost:4321",
        replace: mockReplace,
      });

      const session = createMockSession({
        user: createMockUser({ id: "new-user-555", email: "new@example.com" }),
      });

      render(<AuthListener initialUserId="old-user-111" />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      expect(handleLogout).not.toHaveBeenCalled();
    });

    it("handles search params on /dashboard (?tab=settings) and still strictly evicts on identity mismatch", async () => {
      vi.stubGlobal("location", {
        href: "http://localhost:4321/dashboard?tab=settings",
        pathname: "/dashboard",
        search: "?tab=settings",
        hash: "",
        origin: "http://localhost:4321",
        replace: mockReplace,
      });

      const session = createMockSession({
        user: createMockUser({ id: "intruder-888", email: "intruder@example.com" }),
      });

      render(<AuthListener initialUserId="owner-222" />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
      });

      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe("Stress Dimension 4: Sequential Events and Identity Drift During Session", () => {
    it("allows identical user identity across multiple consecutive SIGNED_IN events", async () => {
      vi.stubGlobal("location", {
        href: "http://localhost:4321/dashboard",
        pathname: "/dashboard",
        search: "",
        hash: "",
        origin: "http://localhost:4321",
        replace: mockReplace,
      });

      const session = createMockSession({
        user: createMockUser({ id: "valid-user", email: "valid@example.com" }),
      });

      render(<AuthListener initialUserId="valid-user" />);

      await act(async () => {
        await authStateCallback?.("SIGNED_IN", session);
        await authStateCallback?.("SIGNED_IN", session);
      });

      expect(handleLogout).not.toHaveBeenCalled();
    });

    it("immediately catches sudden identity drift from valid-user to rogue-user mid-session", async () => {
      vi.stubGlobal("location", {
        href: "http://localhost:4321/dashboard",
        pathname: "/dashboard",
        search: "",
        hash: "",
        origin: "http://localhost:4321",
        replace: mockReplace,
      });

      const validSession = createMockSession({
        user: createMockUser({ id: "valid-user", email: "valid@example.com" }),
      });
      const rogueSession = createMockSession({
        user: createMockUser({ id: "rogue-user", email: "rogue@example.com" }),
      });

      render(<AuthListener initialUserId="valid-user" />);

      // First event is valid
      await act(async () => {
        await authStateCallback?.("SIGNED_IN", validSession);
      });
      expect(handleLogout).not.toHaveBeenCalled();

      // Second event mid-session is corrupted/switched
      await act(async () => {
        await authStateCallback?.("SIGNED_IN", rogueSession);
      });

      expect(handleLogout).toHaveBeenCalledTimes(1);
    });
  });
});
