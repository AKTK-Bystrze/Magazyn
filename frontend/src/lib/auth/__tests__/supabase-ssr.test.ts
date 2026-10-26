import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AstroCookies } from "astro";
import {
  createCookieMethods,
  createSupabaseServerClient,
  AUTH_COOKIE_NAME,
  CHUNKED_COOKIE_REGEX,
} from "../supabase-ssr";

describe("supabase-ssr", () => {
  beforeEach(() => {
    vi.stubEnv("PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
  });

  describe("constants and regex", () => {
    it("has the expected AUTH_COOKIE_NAME", () => {
      expect(AUTH_COOKIE_NAME).toBe("sb-magazyn-auth-token");
    });

    it("CHUNKED_COOKIE_REGEX matches chunked names and rejects base or unrelated names", () => {
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.0")).toBe(true);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.1")).toBe(true);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.9")).toBe(true);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token")).toBe(false);
      expect(CHUNKED_COOKIE_REGEX.test("sb-magazyn-auth-token.other")).toBe(false);
      expect(CHUNKED_COOKIE_REGEX.test("other-cookie.0")).toBe(false);
    });
  });

  describe("createCookieMethods", () => {
    let mockCookies: AstroCookies;
    let setCalls: Array<{ name: string; value: string; options?: Record<string, unknown> }>;
    let deleteCalls: Array<{ name: string; options?: Record<string, unknown> }>;

    beforeEach(() => {
      setCalls = [];
      deleteCalls = [];
      mockCookies = {
        set: vi.fn((name: string, value: string, options?: Record<string, unknown>) => {
          setCalls.push({ name, value, options });
        }),
        delete: vi.fn((name: string, options?: Record<string, unknown>) => {
          deleteCalls.push({ name, options });
        }),
      } as unknown as AstroCookies;
    });

    describe("getAll", () => {
      it("returns parsed cookies from Request Cookie header", () => {
        const request = new Request("http://localhost:3000", {
          headers: {
            Cookie: "sb-magazyn-auth-token=token123; other=value456",
          },
        });
        const methods = createCookieMethods(request, mockCookies);
        const result = methods.getAll();

        expect(result).toEqual([
          { name: "sb-magazyn-auth-token", value: "token123" },
          { name: "other", value: "value456" },
        ]);
      });

      it("returns empty array when Cookie header is absent", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);
        const result = methods.getAll();

        expect(result).toEqual([]);
      });
    });

    describe("setAll - bilateral chunked vs base pruning", () => {
      it("purges unchunked base cookie when chunked cookies are written", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "sb-magazyn-auth-token.0",
            value: "chunk0-data",
            options: { maxAge: 3600 },
          },
          {
            name: "sb-magazyn-auth-token.1",
            value: "chunk1-data",
            options: { maxAge: 3600 },
          },
        ]);

        // Base cookie must be immediately purged with path: "/"
        expect(deleteCalls).toContainEqual({
          name: "sb-magazyn-auth-token",
          options: { path: "/" },
        });

        // The chunked cookies should be set with sameSite: "lax" and path: "/"
        expect(setCalls).toEqual([
          {
            name: "sb-magazyn-auth-token.0",
            value: "chunk0-data",
            options: { maxAge: 3600, path: "/", sameSite: "lax" },
          },
          {
            name: "sb-magazyn-auth-token.1",
            value: "chunk1-data",
            options: { maxAge: 3600, path: "/", sameSite: "lax" },
          },
        ]);
      });

      it("purges orphaned chunk cookies .0 through .9 when base cookie is written", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "sb-magazyn-auth-token",
            value: "base-token-value",
            options: { maxAge: 3600 },
          },
        ]);

        // All 10 chunks must be deleted
        for (let i = 0; i <= 9; i++) {
          expect(deleteCalls).toContainEqual({
            name: `sb-magazyn-auth-token.${i}`,
            options: { path: "/" },
          });
        }

        // Base cookie is set with sameSite: "lax" and path: "/"
        expect(setCalls).toEqual([
          {
            name: "sb-magazyn-auth-token",
            value: "base-token-value",
            options: { maxAge: 3600, path: "/", sameSite: "lax" },
          },
        ]);
      });

      it("prevents setting base cookie if chunked cookies are present in the same setAll batch", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "sb-magazyn-auth-token.0",
            value: "chunk0",
            options: { maxAge: 3600 },
          },
          {
            name: "sb-magazyn-auth-token",
            value: "stale-base-value",
            options: { maxAge: 3600 },
          },
        ]);

        // Only chunk 0 should be set, base cookie should be deleted not set
        expect(setCalls.some((c) => c.name === "sb-magazyn-auth-token")).toBe(false);
        expect(setCalls.some((c) => c.name === "sb-magazyn-auth-token.0")).toBe(true);
        expect(deleteCalls.some((c) => c.name === "sb-magazyn-auth-token")).toBe(true);
      });

      it("prevents setting chunk cookies if base cookie is present in the same setAll batch", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "sb-magazyn-auth-token",
            value: "base-token",
            options: { maxAge: 3600 },
          },
          {
            name: "sb-magazyn-auth-token.0",
            value: "stale-chunk",
            options: { maxAge: 0 },
          },
        ]);

        expect(setCalls.some((c) => c.name === "sb-magazyn-auth-token.0")).toBe(false);
        expect(setCalls.some((c) => c.name === "sb-magazyn-auth-token")).toBe(true);
        expect(deleteCalls.some((c) => c.name === "sb-magazyn-auth-token.0")).toBe(true);
      });
    });

    describe("setAll - deletion semantics", () => {
      it("invokes cookies.delete when value is empty string", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "sb-magazyn-auth-token",
            value: "",
            options: { maxAge: 3600 },
          },
        ]);

        expect(mockCookies.set).not.toHaveBeenCalled();
        expect(deleteCalls).toContainEqual({
          name: "sb-magazyn-auth-token",
          options: { path: "/" },
        });
      });

      it("invokes cookies.delete when options.maxAge is 0", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "sb-magazyn-auth-token.0",
            value: "some-expired-value",
            options: { maxAge: 0 },
          },
        ]);

        expect(mockCookies.set).not.toHaveBeenCalled();
        expect(deleteCalls).toContainEqual({
          name: "sb-magazyn-auth-token.0",
          options: { path: "/" },
        });
      });

      it("preserves options.path and options.domain on delete if specified", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "custom-cookie",
            value: "",
            options: { path: "/custom", domain: "example.com" },
          },
        ]);

        expect(deleteCalls).toContainEqual({
          name: "custom-cookie",
          options: { path: "/custom", domain: "example.com" },
        });
      });
    });

    describe("setAll - attribute enforcement", () => {
      it("enforces path: '/' and sameSite: 'lax' while preserving other options", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "generic-cookie",
            value: "generic-val",
            options: { httpOnly: true, secure: true, maxAge: 1800 },
          },
        ]);

        expect(setCalls).toEqual([
          {
            name: "generic-cookie",
            value: "generic-val",
            options: {
              httpOnly: true,
              secure: true,
              maxAge: 1800,
              path: "/",
              sameSite: "lax",
            },
          },
        ]);
      });

      it("respects custom path when provided in options", () => {
        const request = new Request("http://localhost:3000");
        const methods = createCookieMethods(request, mockCookies);

        methods.setAll([
          {
            name: "generic-cookie",
            value: "generic-val",
            options: { path: "/admin" },
          },
        ]);

        expect(setCalls).toEqual([
          {
            name: "generic-cookie",
            value: "generic-val",
            options: { path: "/admin", sameSite: "lax" },
          },
        ]);
      });
    });
  });

  describe("createSupabaseServerClient", () => {
    it("instantiates a SupabaseClient without error", () => {
      const request = new Request("http://localhost:3000");
      const mockCookies = {
        set: vi.fn(),
        delete: vi.fn(),
      } as unknown as AstroCookies;

      const client = createSupabaseServerClient(request, mockCookies);
      expect(client).toBeDefined();
      expect(client.auth).toBeDefined();
    });
  });
});
