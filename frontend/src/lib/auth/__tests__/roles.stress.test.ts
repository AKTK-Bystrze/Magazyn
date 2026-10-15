import { describe, it, expect } from "vitest";
import { isAdmin, isSuperAdmin, ADMIN_ROLE, SUPER_ADMIN_ROLE } from "../roles";
import { USER_ROLE } from "@/lib/config/constants/user/role";

describe("roles utilities - empirical stress & adversarial harness", () => {
  describe("Exact role matching and contract invariants", () => {
    it("recognizes valid admin role strings", () => {
      expect(isAdmin(ADMIN_ROLE)).toBe(true);
      expect(isAdmin("admin")).toBe(true);
      expect(isAdmin(USER_ROLE.ADMIN)).toBe(true);
    });

    it("recognizes valid super_admin role strings for both isAdmin and isSuperAdmin", () => {
      expect(isAdmin(SUPER_ADMIN_ROLE)).toBe(true);
      expect(isAdmin("super_admin")).toBe(true);
      expect(isAdmin(USER_ROLE.SUPER_ADMIN)).toBe(true);

      expect(isSuperAdmin(SUPER_ADMIN_ROLE)).toBe(true);
      expect(isSuperAdmin("super_admin")).toBe(true);
      expect(isSuperAdmin(USER_ROLE.SUPER_ADMIN)).toBe(true);
    });

    it("ensures admin is NOT considered super_admin", () => {
      expect(isSuperAdmin(ADMIN_ROLE)).toBe(false);
      expect(isSuperAdmin("admin")).toBe(false);
      expect(isSuperAdmin(USER_ROLE.ADMIN)).toBe(false);
    });

    it("ensures normal user is neither admin nor super_admin", () => {
      expect(isAdmin(USER_ROLE.USER)).toBe(false);
      expect(isAdmin("user")).toBe(false);
      expect(isSuperAdmin(USER_ROLE.USER)).toBe(false);
      expect(isSuperAdmin("user")).toBe(false);
    });
  });

  describe("Edge-case and nullish handling", () => {
    it("handles null and undefined gracefully without errors", () => {
      expect(isAdmin(null)).toBe(false);
      expect(isAdmin(undefined)).toBe(false);
      expect(isSuperAdmin(null)).toBe(false);
      expect(isSuperAdmin(undefined)).toBe(false);
    });

    it("handles empty and whitespace-only strings", () => {
      const whitespaces = ["", " ", "   ", "\t", "\n", "\r\n", " \t \n "];
      for (const ws of whitespaces) {
        expect(isAdmin(ws)).toBe(false);
        expect(isSuperAdmin(ws)).toBe(false);
      }
    });

    it("rejects untrimmed roles (strict matching)", () => {
      expect(isAdmin(" admin")).toBe(false);
      expect(isAdmin("admin ")).toBe(false);
      expect(isAdmin(" admin ")).toBe(false);
      expect(isAdmin(" super_admin")).toBe(false);
      expect(isAdmin("super_admin ")).toBe(false);
      expect(isSuperAdmin(" super_admin")).toBe(false);
      expect(isSuperAdmin("super_admin ")).toBe(false);
    });

    it("is strictly case-sensitive", () => {
      const caseVariants = [
        "Admin",
        "ADMIN",
        "aDmin",
        "admiN",
        "Super_Admin",
        "SUPER_ADMIN",
        "Super_admin",
        "super_Admin",
        "SUPERADMIN",
        "superadmin",
      ];
      for (const variant of caseVariants) {
        expect(isAdmin(variant)).toBe(false);
        expect(isSuperAdmin(variant)).toBe(false);
      }
    });
  });

  describe("Adversarial injection and security boundary tests", () => {
    it("rejects malicious injection strings", () => {
      const attackPayloads = [
        "admin' OR '1'='1",
        "admin'--",
        "admin; DROP TABLE users;",
        "<script>alert('admin')</script>",
        "admin\0",
        "\0admin",
        "admin\r\n",
        "super_admin' OR '1'='1",
        "super_admin;--",
        "../admin",
        "admin/../../",
        "__proto__",
        "constructor",
        "toString",
        "valueOf",
        "hasOwnProperty",
      ];

      for (const payload of attackPayloads) {
        expect(isAdmin(payload)).toBe(false);
        expect(isSuperAdmin(payload)).toBe(false);
      }
    });

    it("safely handles unexpected non-string types at runtime without throwing", () => {
      const unexpectedInputs: unknown[] = [
        0,
        1,
        -1,
        NaN,
        Infinity,
        true,
        false,
        {},
        { role: "admin" },
        [],
        ["admin"],
        ["super_admin"],
        () => "admin",
        Symbol("admin"),
      ];

      for (const input of unexpectedInputs) {
        // @ts-expect-error Testing adversarial runtime inputs
        expect(isAdmin(input)).toBe(false);
        // @ts-expect-error Testing adversarial runtime inputs
        expect(isSuperAdmin(input)).toBe(false);
      }
    });
  });

  describe("Oracle & truth-table equivalence test", () => {
    it("proves equivalence between isAdmin(role) and (role === 'admin' || role === 'super_admin')", () => {
      const testUniverse = [
        "admin",
        "super_admin",
        "user",
        "",
        " ",
        null,
        undefined,
        "ADMIN",
        "SUPER_ADMIN",
        "guest",
        "moderator",
        "manager",
        "root",
        "developer",
      ];

      for (const candidate of testUniverse) {
        const expected = candidate === "admin" || candidate === "super_admin";
        expect(isAdmin(candidate)).toBe(expected);
      }
    });

    it("proves equivalence between isSuperAdmin(role) and (role === 'super_admin')", () => {
      const testUniverse = [
        "admin",
        "super_admin",
        "user",
        "",
        " ",
        null,
        undefined,
        "ADMIN",
        "SUPER_ADMIN",
        "guest",
        "moderator",
        "manager",
        "root",
        "developer",
      ];

      for (const candidate of testUniverse) {
        const expected = candidate === "super_admin";
        expect(isSuperAdmin(candidate)).toBe(expected);
      }
    });

    it("verifies the fixed checkout bug condition in create.astro:35", () => {
      // The bug was: isAdmin={sessionInfo.role === "admin"} which resulted in false for super_admin!
      const previousImplementation = (role: string | null | undefined) => role === "admin";
      const newImplementation = (role: string | null | undefined) => isAdmin(role);

      // For admin: both are true
      expect(previousImplementation("admin")).toBe(true);
      expect(newImplementation("admin")).toBe(true);

      // For super_admin: previous was FALSE (BUG), new is TRUE (FIXED)
      expect(previousImplementation("super_admin")).toBe(false);
      expect(newImplementation("super_admin")).toBe(true);

      // For user: both are false
      expect(previousImplementation("user")).toBe(false);
      expect(newImplementation("user")).toBe(false);
    });
  });
});
