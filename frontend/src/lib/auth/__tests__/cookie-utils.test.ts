import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { AstroCookies } from "astro";
import { removeAuthCookie, clearAllAuthCookies } from "../cookie-utils";

describe("cookie-utils", () => {
  let mockCookie = "";

  beforeEach(() => {
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

  afterEach(() => {
    mockCookie = "";
  });

  describe("removeAuthCookie", () => {
    it("clears cookie by setting max-age to 0", () => {
      mockCookie = "magazyn-auth-token=some-token; path=/";
      removeAuthCookie();

      expect(mockCookie).not.toContain("magazyn-auth-token=some-token");
    });

    it("works even if cookie does not exist", () => {
      mockCookie = "";
      expect(() => removeAuthCookie()).not.toThrow();
    });
  });

  describe("clearAllAuthCookies", () => {
    it("deletes matching Supabase and auth cookies from AstroCookies", () => {
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

      expect(mockCookies.delete).toHaveBeenCalledTimes(5);
      expect(deletedCookies).toEqual([
        { name: "sb-magazyn-auth-token", options: { path: "/" } },
        { name: "sb-access-token", options: { path: "/" } },
        { name: "sb-refresh-token", options: { path: "/" } },
        { name: "sb-session-token", options: { path: "/" } },
        { name: "magazyn-auth-token", options: { path: "/" } },
      ]);
    });

    it("does nothing when Cookie header is absent", () => {
      const mockCookies = {
        delete: vi.fn(),
      } as unknown as AstroCookies;

      const request = new Request("http://localhost:3000");

      clearAllAuthCookies(request, mockCookies);

      expect(mockCookies.delete).not.toHaveBeenCalled();
    });
  });
});
