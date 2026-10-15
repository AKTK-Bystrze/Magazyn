import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: "mock-token" } },
      }),
    },
  },
}));

import { handleFetchError } from "../client";

describe("Adversarial Stress Test: handleFetchError", () => {
  it("parses JSON with message field", async () => {
    const res = new Response(JSON.stringify({ message: "Equipment is currently reserved" }), {
      status: 409,
      headers: { "Content-Type": "application/json" },
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("Equipment is currently reserved");
      expect(error.status).toBe(409);
      expect(error.details).toBeUndefined();
    }
  });

  it("parses JSON with error field when message is missing", async () => {
    const res = new Response(JSON.stringify({ error: "Unauthorized access attempt" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("Unauthorized access attempt");
      expect(error.status).toBe(401);
      expect(error.details).toBeUndefined();
    }
  });

  it("prefers message over error field when both exist", async () => {
    const res = new Response(
      JSON.stringify({ message: "Specific message", error: "Generic error", details: { code: 1 } }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("Specific message");
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ code: 1 });
    }
  });

  it("parses details field when message and error are omitted", async () => {
    const res = new Response(
      JSON.stringify({ details: { reason: "out_of_stock", unavailableIds: ["eq-1", "eq-2"] } }),
      { status: 422, headers: { "Content-Type": "application/json" } }
    );

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("An error occurred");
      expect(error.status).toBe(422);
      expect(error.details).toEqual({
        reason: "out_of_stock",
        unavailableIds: ["eq-1", "eq-2"],
      });
    }
  });

  it("gracefully falls back when body is raw HTML error page", async () => {
    const htmlBody = `<!DOCTYPE html>
<html>
<head><title>502 Bad Gateway</title></head>
<body><center><h1>502 Bad Gateway</h1></center><hr><center>cloudflare</center></body>
</html>`;
    const res = new Response(htmlBody, {
      status: 502,
      headers: { "Content-Type": "text/html" },
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("Network error");
      expect(error.status).toBe(502);
      expect(error.details).toBeUndefined();
    }
  });

  it("gracefully falls back when body is completely empty", async () => {
    const res = new Response("", {
      status: 500,
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("Network error");
      expect(error.status).toBe(500);
      expect(error.details).toBeUndefined();
    }
  });

  it("gracefully falls back when body is only whitespace", async () => {
    const res = new Response("    \n\t   ", {
      status: 503,
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("Network error");
      expect(error.status).toBe(503);
    }
  });

  it("gracefully falls back when JSON body is malformed / truncated", async () => {
    const res = new Response('{"message": "Broken truncation...', {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("Network error");
      expect(error.status).toBe(400);
    }
  });

  it("correctly preserves all HTTP error status codes", async () => {
    const statusCodes = [400, 401, 403, 404, 408, 409, 422, 429, 500, 502, 503, 504];

    for (const code of statusCodes) {
      const res = new Response(JSON.stringify({ error: `Error code ${code}` }), {
        status: code,
      });

      try {
        await handleFetchError(res);
        expect.unreachable();
      } catch (err: unknown) {
        const error = err as Error & { status?: number };
        expect(error.status).toBe(code);
        expect(error.message).toBe(`Error code ${code}`);
      }
    }
  });

  it("handles empty JSON object {}", async () => {
    const res = new Response("{}", {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("An error occurred");
      expect(error.status).toBe(400);
      expect(error.details).toBeUndefined();
    }
  });

  it("handles JSON array body gracefully", async () => {
    const res = new Response(JSON.stringify(["validation item 1", "validation item 2"]), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      // Array does not have .message or .error properties
      expect(error.message).toBe("An error occurred");
      expect(error.status).toBe(422);
    }
  });

  it("handles null JSON body ('null') gracefully with fallback message", async () => {
    const res = new Response("null", {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });

    try {
      await handleFetchError(res);
      expect.unreachable();
    } catch (err: unknown) {
      const error = err as Error & { status?: number; details?: unknown };
      expect(error.message).toBe("An error occurred");
      expect(error.status).toBe(400);
      expect(error.details).toBeUndefined();
    }
  });
});
