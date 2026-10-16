import { defaultLogger as logger } from "@/lib/utils/logger";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { isSafeRedirect, validateRedirectUrl } from "../url-utils";

describe("url-utils", () => {
  const origin = "http://localhost:4321";

  beforeEach(() => {
    vi.spyOn(logger, "warn").mockImplementation(() => {});
    vi.spyOn(logger, "error").mockImplementation(() => {});
  });

  describe("isSafeRedirect", () => {
    it.each([
      ["/login", true],
      ["/admin", true],
      ["/dashboard", true],
      ["/account-disabled", true],
      ["/dashboard?tab=overview", true],
      ["/admin#settings", true],
      ["/admin?redirect=<script>alert(1)</script>", true],
      ["https://evil.com", false],
      ["http://evil.com", false],
      ["https://evil.com/admin", false],
      ["//evil.com", false],
      ["data:text/html,<script>alert(1)</script>", false],
      ["javascript:alert(1)", false],
      ["/non-existent", false],
      ["/secret-admin-backdoor", false],
      ["/admin/../../../etc/passwd", false],
      ["/", false],
      ["ht!tp://invalid", false],
      ["", false],
      ["http://localhost:3000/admin", false],
      ["https://localhost:4321/admin", false],
      ["http://127.0.0.1:4321/admin", false],
    ])("isSafeRedirect(%s) -> %s", (url, expected) => {
      expect(isSafeRedirect(url, origin)).toBe(expected);
    });
  });

  describe("validateRedirectUrl", () => {
    it.each([
      ["/admin", undefined, "/admin"],
      ["/dashboard", undefined, "/dashboard"],
      ["/account-disabled", undefined, "/account-disabled"],
      ["/dashboard?tab=overview", undefined, "/dashboard?tab=overview"],
      ["https://evil.com", undefined, "/login"],
      ["https://evil.com", "/dashboard", "/dashboard"],
      ["/non-existent", "/admin", "/admin"],
      ["ht!tp://invalid", "/dashboard", "/dashboard"],
      [null, "/dashboard", "/dashboard"],
      ["", "/admin", "/admin"],
      ["/", "/dashboard", "/dashboard"],
      ["/login", "/dashboard", "/dashboard"],
      [null, undefined, "/login"],
      ["https://evil.com?fake=/admin", "/login", "/login"],
      ["https://phishing-site.com", "/login", "/login"],
      ["https%3A%2F%2Fevil.com", "/login", "/login"],
    ])("validateRedirectUrl(%s, %s) -> %s", (url, fallback, expected) => {
      expect(validateRedirectUrl(url, origin, fallback)).toBe(expected);
    });
  });

  describe("Integration Tests", () => {
    it("validates redirect flow: malicious attempt → safe fallback", () => {
      const safeUrl = validateRedirectUrl("https://evil.com/steal-data", origin, "/dashboard");
      expect(safeUrl).toBe("/dashboard");
      expect(isSafeRedirect(safeUrl, origin)).toBe(true);
    });

    it("validates redirect flow: safe URL → passes through", () => {
      const safeUrl = validateRedirectUrl("/admin", origin, "/dashboard");
      expect(safeUrl).toBe("/admin");
      expect(isSafeRedirect(safeUrl, origin)).toBe(true);
    });
  });
});
