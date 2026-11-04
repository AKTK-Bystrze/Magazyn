import { defaultLogger as logger } from "@/lib/utils/logger";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getUserSession } from "../session-utils";
import { createMockSessionInfo } from "@/test/fixtures/auth-fixtures";
import type { SessionInfo } from "../../../types";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.spyOn(logger, "info").mockImplementation(() => {});
vi.spyOn(logger, "error").mockImplementation(() => {});

const mockSessionInfo: SessionInfo = createMockSessionInfo({
  userId: "uuid-12345",
  role: "super_admin",
  creditBalance: 500,
});

const validAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validtoken";

describe("getUserSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("successful response", () => {
    it("should return ok with SessionInfo on 200 OK response with correct request options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSessionInfo),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);

      expect(result).toEqual({ status: "ok", sessionInfo: mockSessionInfo });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/http:\/\/(localhost|127\.0\.0\.1):8080\/auth\/session/),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${validAccessToken}`,
          }),
          cache: "no-store",
        })
      );
    });

    it("should return SessionInfo with correct isEnabled value", async () => {
      const disabledSession: SessionInfo = {
        ...mockSessionInfo,
        isEnabled: false,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(disabledSession),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);
      expect(result.status).toBe("ok");
      if (result.status === "ok") {
        expect(result.sessionInfo.isEnabled).toBe(false);
      }
    });
  });

  describe("error handling", () => {
    it("should return unauthorized on 401", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("Invalid token"),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);
      expect(result).toEqual({ status: "unauthorized" });
    });

    it.each([
      [500, "Internal Server Error", "Server error"],
      [502, "Bad Gateway", "Upstream error"],
    ])("should return unavailable on HTTP %i", async (status, statusText, text) => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status,
        statusText,
        text: () => Promise.resolve(text),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);
      expect(result.status).toBe("unavailable");
      if (result.status === "unavailable") {
        expect(result.error).toContain(String(status));
      }
    });

    it.each([
      ["network error", new Error("Network error")],
      ["fetch timeout", new Error("AbortError: The operation was aborted.")],
    ])("should return unavailable on %s", async (_, error) => {
      mockFetch.mockRejectedValueOnce(error);
      const result = await getUserSession(validAccessToken);
      expect(result.status).toBe("unavailable");
    });
  });
});
