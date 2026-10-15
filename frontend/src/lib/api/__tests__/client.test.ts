import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleFetchError, api } from "../client";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

describe("API client error handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("handleFetchError", () => {
    it("extracts message from json response error", async () => {
      const mockResponse = new Response(JSON.stringify({ message: "Equipment unavailable" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });

      await expect(handleFetchError(mockResponse)).rejects.toThrow("Equipment unavailable");
    });

    it("extracts error field from json response error", async () => {
      const mockResponse = new Response(
        JSON.stringify({ error: "Unauthorized access", details: { code: 401 } }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );

      try {
        await handleFetchError(mockResponse);
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as Error & { status?: number; details?: unknown };
        expect(error.message).toBe("Unauthorized access");
        expect(error.status).toBe(401);
        expect(error.details).toEqual({ code: 401 });
      }
    });

    it("handles non-JSON error responses gracefully with fallback", async () => {
      const mockResponse = new Response("Bad Gateway", { status: 502 });

      try {
        await handleFetchError(mockResponse);
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as Error & { status?: number };
        expect(error.message).toBe("Network error");
        expect(error.status).toBe(502);
      }
    });
  });

  describe("api methods error handling consolidation", () => {
    it("api.post propagates handled fetch error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: "Validation failed" }), { status: 422 })
        );

      await expect(api.post("/test", {})).rejects.toThrow("Validation failed");
    });

    it("api.get propagates handled fetch error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ error: "Not Found" }), { status: 404 }));

      await expect(api.get("/test")).rejects.toThrow("Not Found");
    });

    it("api.patch propagates handled fetch error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: "Conflict detected" }), { status: 409 })
        );

      await expect(api.patch("/test", {})).rejects.toThrow("Conflict detected");
    });

    it("api.put propagates handled fetch error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(JSON.stringify({ message: "Forbidden" }), { status: 403 }));

      await expect(api.put("/test", {})).rejects.toThrow("Forbidden");
    });

    it("api.delete propagates handled fetch error", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: "Internal Error" }), { status: 500 })
        );

      await expect(api.delete("/test")).rejects.toThrow("Internal Error");
    });
  });
});
