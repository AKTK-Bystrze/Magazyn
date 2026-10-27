import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AstroCookies } from "astro";
import {
  removeAuthCookie,
  clearAllAuthCookies,
  getCookieNamesToDelete,
  AUTH_COOKIE_NAME,
  CHUNKED_COOKIE_REGEX,
  pruneCookieList,
  createBrowserCookieMethods,
} from "../cookie-utils";

describe("cookie-utils", () => {
  let originalDocument: Document;
  let cookieWrites: string[] = [];
  let mockCookie = "";

  beforeEach(() => {
    cookieWrites = [];
    mockCookie = "";
    originalDocument = global.document;

    // Mock document.cookie with getter and setter
    Object.defineProperty(global, "document", {
      value: {
        get cookie() {
          return mockCookie;
        },
        set cookie(val: string) {
          cookieWrites.push(val);
          mockCookie = val;
        },
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    global.document = originalDocument;
    cookieWrites = [];
  });

  describe("constants and regex", () => {
    it("exports expected cookie name", () => {
      expect(AUTH_COOKIE_NAME).toBe("sb-magazyn-auth-token");
    });

    it("matches chunked names with CHUNKED_COOKIE_REGEX and rejects non-chunks", () => {
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.0")).toBe(true);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.1")).toBe(true);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.9")).toBe(true);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.15")).toBe(true);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token")).toBe(false);
      expect(CHUNKED_COOKIE_REGEX.test("other-token.0")).toBe(false);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.abc")).toBe(false);
    });
  });

  describe("getCookieNamesToDelete", () => {
    it("generates base token and chunks 0-9 (11 cookies) by default", () => {
      const names = getCookieNamesToDelete();
      expect(names.size).toBe(11);
      expect(names.has("sb-magazyn-auth-token")).toBe(true);
      for (let i = 0; i <= 9; i++) {
        expect(names.has(`sb-magazyn-auth-token.${i}`)).toBe(true);
      }
    });

    it("generates only chunked tokens 0-9 (10 cookies) when chunkedOnly is true", () => {
      const names = getCookieNamesToDelete(null, { chunkedOnly: true });
      expect(names.size).toBe(10);
      expect(names.has("sb-magazyn-auth-token")).toBe(false);
      for (let i = 0; i <= 9; i++) {
        expect(names.has(`sb-magazyn-auth-token.${i}`)).toBe(true);
      }
    });

    it("includes additional sb- prefixed cookies from cookie string", () => {
      const names = getCookieNamesToDelete("sb-custom=1; sb-provider=2; other=3");
      expect(names.has("sb-custom")).toBe(true);
      expect(names.has("sb-provider")).toBe(true);
      expect(names.has("other")).toBe(false);
    });

    it("only includes additional chunked cookies when chunkedOnly is true", () => {
      const names = getCookieNamesToDelete("sb-magazyn-auth-token.10=val; sb-custom=1; other=2", {
        chunkedOnly: true,
      });
      expect(names.has("sb-magazyn-auth-token.10")).toBe(true);
      expect(names.has("sb-custom")).toBe(false);
      expect(names.has("other")).toBe(false);
    });
  });

  describe("pruneCookieList", () => {
    it("suppresses unchunked base cookie when chunked cookies (.0) are present", () => {
      const input = [
        { name: "sb-magazyn-auth-token", value: "stale-base" },
        { name: "sb-magazyn-auth-token.0", value: "chunk0" },
        { name: "sb-magazyn-auth-token.1", value: "chunk1" },
        { name: "theme", value: "dark" },
      ];

      const result = pruneCookieList(input);

      expect(result).toEqual([
        { name: "sb-magazyn-auth-token.0", value: "chunk0" },
        { name: "sb-magazyn-auth-token.1", value: "chunk1" },
        { name: "theme", value: "dark" },
      ]);
      expect(result.some((c) => c.name === "sb-magazyn-auth-token")).toBe(false);
    });

    it("preserves unchunked base cookie when no chunked cookies are present", () => {
      const input = [
        { name: "sb-magazyn-auth-token", value: "valid-base" },
        { name: "theme", value: "dark" },
      ];

      const result = pruneCookieList(input);

      expect(result).toEqual([
        { name: "sb-magazyn-auth-token", value: "valid-base" },
        { name: "theme", value: "dark" },
      ]);
    });

    it("preserves base cookie if chunked cookies have empty values", () => {
      const input = [
        { name: "sb-magazyn-auth-token", value: "valid-base" },
        { name: "sb-magazyn-auth-token.0", value: "" },
      ];

      const result = pruneCookieList(input);

      expect(result).toEqual([
        { name: "sb-magazyn-auth-token", value: "valid-base" },
        { name: "sb-magazyn-auth-token.0", value: "" },
      ]);
    });

    it("handles empty cookie list safely", () => {
      expect(pruneCookieList([])).toEqual([]);
    });
  });

  describe("createBrowserCookieMethods", () => {
    describe("getAll", () => {
      it("parses document.cookie and prunes stale base cookie when chunks exist", () => {
        mockCookie =
          "sb-magazyn-auth-token=stale-base; sb-magazyn-auth-token.0=chunk0; sb-magazyn-auth-token.1=chunk1; other=value";

        const methods = createBrowserCookieMethods();
        const result = methods.getAll();

        expect(result).toEqual([
          { name: "sb-magazyn-auth-token.0", value: "chunk0" },
          { name: "sb-magazyn-auth-token.1", value: "chunk1" },
          { name: "other", value: "value" },
        ]);
        expect(result.some((c) => c.name === "sb-magazyn-auth-token")).toBe(false);
      });

      it("returns unchunked base cookie when no chunks are present", () => {
        mockCookie = "sb-magazyn-auth-token=valid-base; theme=dark";

        const methods = createBrowserCookieMethods();
        const result = methods.getAll();

        expect(result).toEqual([
          { name: "sb-magazyn-auth-token", value: "valid-base" },
          { name: "theme", value: "dark" },
        ]);
      });

      it("returns empty array when document.cookie is empty", () => {
        mockCookie = "";

        const methods = createBrowserCookieMethods();
        const result = methods.getAll();

        expect(result).toEqual([]);
      });
    });

    describe("setAll", () => {
      it("purges unchunked base cookie when chunked cookies are written", () => {
        mockCookie = "sb-magazyn-auth-token=old-base";
        const methods = createBrowserCookieMethods();

        methods.setAll([
          {
            name: "sb-magazyn-auth-token.0",
            value: "chunk0-val",
            options: { maxAge: 3600 },
          },
          {
            name: "sb-magazyn-auth-token.1",
            value: "chunk1-val",
            options: { maxAge: 3600 },
          },
        ]);

        expect(cookieWrites).toContainEqual(
          expect.stringContaining("sb-magazyn-auth-token=; path=/; max-age=0")
        );
        expect(cookieWrites).toContainEqual(
          expect.stringContaining("sb-magazyn-auth-token.0=chunk0-val")
        );
        expect(cookieWrites).toContainEqual(
          expect.stringContaining("sb-magazyn-auth-token.1=chunk1-val")
        );
      });

      it("purges orphaned chunks (.0 to .9) when base cookie is written", () => {
        mockCookie = "sb-magazyn-auth-token.0=old0; sb-magazyn-auth-token.1=old1";
        const methods = createBrowserCookieMethods();

        methods.setAll([
          {
            name: "sb-magazyn-auth-token",
            value: "new-base",
            options: { maxAge: 3600 },
          },
        ]);

        for (let i = 0; i <= 9; i++) {
          expect(cookieWrites).toContainEqual(
            expect.stringContaining(`sb-magazyn-auth-token.${i}=; path=/; max-age=0`)
          );
        }
        expect(cookieWrites).toContainEqual(
          expect.stringContaining("sb-magazyn-auth-token=new-base")
        );
      });

      it("deletes cookie when maxAge is 0 or value is empty", () => {
        const methods = createBrowserCookieMethods();

        methods.setAll([
          {
            name: "sb-magazyn-auth-token",
            value: "",
            options: { maxAge: 0 },
          },
        ]);

        expect(cookieWrites).toContainEqual(
          expect.stringContaining("sb-magazyn-auth-token=; path=/; max-age=0")
        );
      });
    });
  });

  describe("removeAuthCookie", () => {
    it("deletes all cookies from document.cookie with path /", () => {
      mockCookie = "sb-magazyn-auth-token=test-token; sb-magazyn-auth-token.0=chunk0";

      removeAuthCookie();

      expect(cookieWrites.length).toBeGreaterThan(0);
      expect(cookieWrites).toContainEqual(
        expect.stringContaining("sb-magazyn-auth-token=; path=/; max-age=0")
      );
      expect(cookieWrites).toContainEqual(
        expect.stringContaining("sb-magazyn-auth-token.0=; path=/; max-age=0")
      );
    });

    it("issues domain-scoped cookie deletions when window.location.hostname is available", () => {
      const originalWindow = global.window;
      Object.defineProperty(global, "window", {
        value: {
          location: {
            hostname: "example.com",
          },
        },
        writable: true,
        configurable: true,
      });

      removeAuthCookie();

      expect(cookieWrites).toContainEqual(
        expect.stringContaining("sb-magazyn-auth-token=; path=/; domain=example.com; max-age=0")
      );

      global.window = originalWindow;
    });
  });

  describe("clearAllAuthCookies", () => {
    it("calls cookies.delete for all generated base and chunk names with path /", () => {
      const deletedCookies: Array<{
        name: string;
        options?: Parameters<AstroCookies["delete"]>[1];
      }> = [];
      const mockAstroCookies: AstroCookies = {
        delete: vi.fn((name: string, options?: Parameters<AstroCookies["delete"]>[1]) => {
          deletedCookies.push({ name, options });
        }),
      } as unknown as AstroCookies;

      const mockRequest = new Request("http://localhost:3000", {
        headers: {
          Cookie: "sb-magazyn-auth-token.0=chunk0; other_cookie=123",
        },
      });

      clearAllAuthCookies(mockRequest, mockAstroCookies);

      expect(deletedCookies.length).toBeGreaterThanOrEqual(11);
      const names = deletedCookies.map((c) => c.name);
      expect(names).toContain("sb-magazyn-auth-token");
      expect(names).toContain("sb-magazyn-auth-token.0");
      expect(names).toContain("sb-magazyn-auth-token.9");
      expect(names).not.toContain("other_cookie");

      for (const call of deletedCookies) {
        expect(call.options).toEqual({ path: "/" });
      }
    });
  });
});
