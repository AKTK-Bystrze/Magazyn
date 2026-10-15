import { describe, it, expect } from "vitest";
import { isAdmin, isSuperAdmin, ADMIN_ROLE, SUPER_ADMIN_ROLE } from "../roles";
import { USER_ROLE } from "@/lib/config/constants/user/role";

describe("roles utilities", () => {
  describe("isAdmin", () => {
    it("returns true for ADMIN_ROLE ('admin')", () => {
      expect(isAdmin(ADMIN_ROLE)).toBe(true);
      expect(isAdmin("admin")).toBe(true);
    });

    it("returns true for SUPER_ADMIN_ROLE ('super_admin')", () => {
      expect(isAdmin(SUPER_ADMIN_ROLE)).toBe(true);
      expect(isAdmin("super_admin")).toBe(true);
    });

    it("returns false for USER_ROLE ('user')", () => {
      expect(isAdmin(USER_ROLE.USER)).toBe(false);
      expect(isAdmin("user")).toBe(false);
    });

    it("returns false for null, undefined, or empty string", () => {
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
      expect(isAdmin("")).toBe(false);
    });

    it("returns false for arbitrary invalid strings", () => {
      expect(isAdmin("moderator")).toBe(false);
      expect(isAdmin("guest")).toBe(false);
      expect(isAdmin("ADMIN")).toBe(false);
    });
  });

  describe("isSuperAdmin", () => {
    it("returns true for SUPER_ADMIN_ROLE ('super_admin')", () => {
      expect(isSuperAdmin(SUPER_ADMIN_ROLE)).toBe(true);
      expect(isSuperAdmin("super_admin")).toBe(true);
    });

    it("returns false for ADMIN_ROLE ('admin')", () => {
      expect(isSuperAdmin(ADMIN_ROLE)).toBe(false);
      expect(isSuperAdmin("admin")).toBe(false);
    });

    it("returns false for USER_ROLE ('user')", () => {
      expect(isSuperAdmin(USER_ROLE.USER)).toBe(false);
      expect(isSuperAdmin("user")).toBe(false);
    });

    it("returns false for null, undefined, or empty string", () => {
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
      expect(isSuperAdmin("")).toBe(false);
    });
  });
});
