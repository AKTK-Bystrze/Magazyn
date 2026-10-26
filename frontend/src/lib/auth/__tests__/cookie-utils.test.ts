import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { AstroCookies } from "astro";
import {
  removeAuthCookie,
  clearAllAuthCookies,
  BASE_AUTH_COOKIE_NAMES,
  AUTH_COOKIE_NAME,
} from "../cookie-utils";

describe("cookie-utils", () => {
  let mockCookie = "";
  let cookieWrites: string[] = [];

  beforeEach(() => {
    mockCookie = "";
    cookieWrites = [];

    Object.defineProperty(document, "cookie", {
      get: () => mockCookie,
      set: (value: string) => {
        cookieWrites.push(value);
        if (value.includes("max-age=0")) {
          const cookieName = value.split("=")[0].trim();
          mockCookie = mockCookie
            .split("; ")
            .filter((c) => !c.startsWith(cookieName + "="))
            .join("; ");
        } else {
          mockCookie = value;
        }
      },
      configurable: true,
    });
  });

  afterEach(() => {
    mockCookie = "";
    cookieWrites = [];
  });

  describe("constants", () => {
    it("exports expected cookie names and bases", () => {
      expect(AUTH_COOKIE_NAME).toBe("sb-magazyn-auth-token");
      expect(BASE_AUTH_COOKIE_NAMES).toEqual(["sb-magazyn-auth-token", "magazyn-auth-token"]);
    });
  });

  describe("removeAuthCookie", () => {
    it("clears existing cookie by setting max-age to 0", () => {
      mockCookie = "sb-magazyn-auth-token=some-token; path=/";
      removeAuthCookie();

      expect(mockCookie).not.toContain("sb-magazyn-auth-token=some-token");
    });

    it("issues dual-scope eviction (host-only and domain-scoped) for base names and chunks 0-9", () => {
      removeAuthCookie();

      expect(cookieWrites).toContain(
        "sb-magazyn-auth-token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
      expect(cookieWrites).toContain(
        "sb-magazyn-auth-token.0=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
      expect(cookieWrites).toContain(
        "sb-magazyn-auth-token.9=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
      expect(cookieWrites).toContain(
        "magazyn-auth-token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
      expect(cookieWrites).toContain(
        "magazyn-auth-token.0=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
      expect(cookieWrites).toContain(
        "magazyn-auth-token.9=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );

      const hostname =
        typeof window !== "undefined" && window.location?.hostname ? window.location.hostname : "";
      if (hostname) {
        expect(cookieWrites).toContain(
          `sb-magazyn-auth-token=; path=/; domain=${hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        );
        expect(cookieWrites).toContain(
          `sb-magazyn-auth-token.0=; path=/; domain=${hostname}; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT`
        );
      }
    });

    it("parses and purges additional dynamic cookies from document.cookie", () => {
      mockCookie = "sb-custom-provider=xyz; other-cookie=abc";
      removeAuthCookie();

      expect(cookieWrites).toContain(
        "sb-custom-provider=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      );
      expect(cookieWrites.some((w) => w.startsWith("other-cookie="))).toBe(false);
    });

    it("works safely even if document.cookie is empty", () => {
      mockCookie = "";
      expect(() => removeAuthCookie()).not.toThrow();
    });
  });

  describe("clearAllAuthCookies", () => {
    it("proactively deletes all 22 base and chunk cookies (.0-.9) with path '/' when Cookie header is absent", () => {
      const deletedCookies: { name: string; options?: Record<string, unknown> }[] = [];
      const mockCookies = {
        delete: vi.fn((name: string, options?: Record<string, unknown>) => {
          deletedCookies.push({ name, options });
        }),
      } as unknown as AstroCookies;

      const request = new Request("http://localhost:3000");

      clearAllAuthCookies(request, mockCookies);

      expect(mockCookies.delete).toHaveBeenCalledTimes(22);
      const deletedNames = deletedCookies.map((d) => d.name);

      expect(deletedNames).toContain("sb-magazyn-auth-token");
      expect(deletedNames).toContain("magazyn-auth-token");

      for (let i = 0; i <= 9; i++) {
        expect(deletedNames).toContain(`sb-magazyn-auth-token.${i}`);
        expect(deletedNames).toContain(`magazyn-auth-token.${i}`);
      }

      for (const entry of deletedCookies) {
        expect(entry.options).toEqual({ path: "/" });
      }
    });

    it("deletes base cookies, chunks, and matching request header cookies without duplicating", () => {
      const deletedCookies: { name: string; options?: Record<string, unknown> }[] = [];
      const mockCookies = {
        delete: vi.fn((name: string, options?: Record<string, unknown>) => {
          deletedCookies.push({ name, options });
        }),
      } as unknown as AstroCookies;

      const request = new Request("http://localhost:3000", {
        headers: {
          Cookie:
            "sb-magazyn-auth-token=val1; sb-access-token=val2; sb-refresh-token=val3; sb-session-token=val4; magazyn-auth-token=val5; other-cookie=val6",
        },
      });

      clearAllAuthCookies(request, mockCookies);

      expect(mockCookies.delete).toHaveBeenCalledTimes(25);
      const deletedNames = deletedCookies.map((d) => d.name);

      expect(deletedNames).toContain("sb-access-token");
      expect(deletedNames).toContain("sb-refresh-token");
      expect(deletedNames).toContain("sb-session-token");
      expect(deletedNames).not.toContain("other-cookie");

      for (const entry of deletedCookies) {
        expect(entry.options).toEqual({ path: "/" });
      }
    });
  });
});
