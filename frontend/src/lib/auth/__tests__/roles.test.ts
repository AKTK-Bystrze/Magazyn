import { describe, it, expect } from "vitest";
import { isAdmin, isSuperAdmin, ADMIN_ROLE, SUPER_ADMIN_ROLE } from "../roles";
import { USER_ROLE } from "@/lib/config/constants/user/role";

describe("roles utilities", () => {
  describe("isAdmin", () => {
    it.each([
      [ADMIN_ROLE, true],
      [SUPER_ADMIN_ROLE, true],
      [USER_ROLE.USER, false],
      [null, false],
      [undefined, false],
      ["", false],
      ["moderator", false],
      ["guest", false],
      ["ADMIN", false],
    ])("isAdmin(%s) -> %s", (role, expected) => {
      expect(isAdmin(role)).toBe(expected);
    });
  });

  describe("isSuperAdmin", () => {
    it.each([
      [SUPER_ADMIN_ROLE, true],
      [ADMIN_ROLE, false],
      [USER_ROLE.USER, false],
      [null, false],
      [undefined, false],
      ["", false],
    ])("isSuperAdmin(%s) -> %s", (role, expected) => {
      expect(isSuperAdmin(role)).toBe(expected);
    });
  });
});
