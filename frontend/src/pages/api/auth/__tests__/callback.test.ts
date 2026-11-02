import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../callback";
import type { APIContext } from "astro";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/auth/session-utils", () => ({
  getUserSession: vi.fn(),
}));

vi.mock("@/lib/auth/session-store", () => ({
  encryptSession: vi.fn().mockResolvedValue("encrypted-session-cookie"),
  SESSION_COOKIE: "magazyn_session",
  SESSION_COOKIE_OPTIONS: {},
}));

vi.mock("@/lib/auth/redirect-manager", () => ({
  RedirectManager: {
    getRedirectForAuthState: vi.fn().mockReturnValue("/dashboard"),
  },
}));

describe("Magic Link Callback Handler", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/auth/callback", () => {
    it("returns handoff HTML page containing client-side extraction logic", async () => {
      const response = await GET({} as APIContext);
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("text/html; charset=utf-8");

      const html = await response.text();
      expect(html).toContain("Trwa logowanie, proszę czekać...");
      expect(html).toContain("error_code");
      expect(html).toContain("access_token");
      expect(html).toContain("refresh_token");
    });
  });

  describe("POST /api/auth/callback", () => {
    it("returns 403 when handoff header is missing", async () => {
      const request = new Request("http://localhost/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: "token", refresh_token: "refresh" }),
      });

      const response = await POST({
        url: new URL("http://localhost/api/auth/callback"),
        request,
        cookies: { set: vi.fn() } as unknown as APIContext["cookies"],
        locals: {
          logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
        } as unknown as APIContext["locals"],
      } as APIContext);

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data).toEqual({ error: "forbidden" });
    });

    it("returns 400 when access_token or refresh_token is missing", async () => {
      const request = new Request("http://localhost/api/auth/callback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-magazyn-handoff": "1",
        },
        body: JSON.stringify({ access_token: "token" }),
      });

      const response = await POST({
        url: new URL("http://localhost/api/auth/callback"),
        request,
        cookies: { set: vi.fn() } as unknown as APIContext["cookies"],
        locals: {
          logger: { warn: vi.fn(), info: vi.fn(), error: vi.fn() },
        } as unknown as APIContext["locals"],
      } as APIContext);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual({ error: "missing_session" });
    });
  });
});
