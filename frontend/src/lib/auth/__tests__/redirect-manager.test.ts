import { defaultLogger as logger } from "@/lib/utils/logger";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { RedirectManager } from "../redirect-manager";
import { createMockUser, createMockSessionInfo } from "@/test/fixtures/auth-fixtures";
import type { SessionInfo } from "../../../types";

describe("redirect-manager", () => {
  const origin = "http://localhost:4321";

  beforeEach(() => {
    vi.spyOn(logger, "warn").mockImplementation(() => {});
    vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  describe("RedirectManager.getRedirectForAuthState", () => {
    describe("Unauthenticated Users", () => {
      it.each([
        ["/admin", "/login?redirect=%2Fadmin"],
        ["/", "/login"],
        ["/login", null],
      ])("from %s redirects to %s", (path, expected) => {
        expect(RedirectManager.getRedirectForAuthState(null, null, path, null, origin)).toBe(
          expected
        );
      });
    });

    describe("Disabled Users", () => {
      it.each([
        [
          "user on /dashboard",
          createMockSessionInfo({ isEnabled: false }),
          "/dashboard",
          "/account-disabled",
        ],
        [
          "user on /account-disabled",
          createMockSessionInfo({ isEnabled: false }),
          "/account-disabled",
          null,
        ],
        [
          "admin on /admin",
          createMockSessionInfo({ isEnabled: false, role: "admin" }),
          "/admin",
          "/account-disabled",
        ],
      ])("%s redirects to %s", (_, session, path, expected) => {
        expect(
          RedirectManager.getRedirectForAuthState(createMockUser(), session, path, null, origin)
        ).toBe(expected);
      });
    });

    describe("Enabled Users on Account-Disabled Page", () => {
      it.each<[string, SessionInfo["role"], string]>([
        ["user", "user", "/dashboard"],
        ["admin", "admin", "/admin"],
        ["super admin", "super_admin", "/admin"],
      ])("redirects enabled %s away to %s", (_, role, expected) => {
        const session = createMockSessionInfo({ isEnabled: true, role });
        expect(
          RedirectManager.getRedirectForAuthState(
            createMockUser(),
            session,
            "/account-disabled",
            null,
            origin
          )
        ).toBe(expected);
      });
    });

    describe("Enabled Users on Login Page", () => {
      it.each<[string, SessionInfo["role"], string | null, string]>([
        ["regular user to dashboard", "user", null, "/dashboard"],
        ["admin to admin", "admin", null, "/admin"],
        ["safe redirect parameter", "user", "/dashboard", "/dashboard"],
        ["sanitizes unsafe redirect parameter", "user", "https://evil.com", "/dashboard"],
        ["ignores redirect pointing back to login", "admin", "/login", "/admin"],
        ["blocks admin redirect for regular user", "user", "/admin", "/dashboard"],
        ["allows admin redirect for admin user", "admin", "/admin", "/admin"],
      ])("%s", (_, role, redirectParam, expected) => {
        const user = createMockUser();
        const sessionInfo = createMockSessionInfo({ role });
        expect(
          RedirectManager.getRedirectForAuthState(
            user,
            sessionInfo,
            "/login",
            redirectParam,
            origin
          )
        ).toBe(expected);
      });
    });

    describe("Admin Route Protection", () => {
      it("redirects regular user attempting to visit /admin to /dashboard", () => {
        const user = createMockUser();
        const session = createMockSessionInfo({ role: "user" });
        expect(RedirectManager.getRedirectForAuthState(user, session, "/admin", null, origin)).toBe(
          "/dashboard"
        );
      });

      it("allows admin user to visit /admin", () => {
        const user = createMockUser();
        const session = createMockSessionInfo({ role: "admin" });
        expect(
          RedirectManager.getRedirectForAuthState(user, session, "/admin", null, origin)
        ).toBeNull();
      });
    });

    describe("Root Path Redirects", () => {
      it.each([
        ["regular user from root", createMockSessionInfo({ role: "user" }), "/", "/dashboard"],
        ["admin from root", createMockSessionInfo({ role: "admin" }), "/", "/admin"],
        ["super admin from root", createMockSessionInfo({ role: "super_admin" }), "/", "/admin"],
        [
          "disabled user from root",
          createMockSessionInfo({ isEnabled: false }),
          "/",
          "/account-disabled",
        ],
        ["user on valid page", createMockSessionInfo({ role: "user" }), "/dashboard", null],
        ["admin on valid page", createMockSessionInfo({ role: "admin" }), "/admin", null],
      ])("%s", (_, session, path, expected) => {
        expect(
          RedirectManager.getRedirectForAuthState(createMockUser(), session, path, null, origin)
        ).toBe(expected);
      });
    });

    describe("Edge Cases", () => {
      it("handles null user and null sessionInfo", () => {
        const result = RedirectManager.getRedirectForAuthState(
          null,
          null,
          "/dashboard",
          null,
          origin
        );
        expect(result).toBe("/login?redirect=%2Fdashboard");
      });

      it("handles user with null sessionInfo on /login without looping", () => {
        const user = createMockUser();
        const result = RedirectManager.getRedirectForAuthState(user, null, "/login", null, origin);
        expect(result).toBeNull();
      });

      it("handles user with null sessionInfo on protected page by redirecting to /login", () => {
        const user = createMockUser();
        const result = RedirectManager.getRedirectForAuthState(
          user,
          null,
          "/dashboard",
          null,
          origin
        );
        expect(result).toBe("/login?redirect=%2Fdashboard");
      });
    });
  });
});
