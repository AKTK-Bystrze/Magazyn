import { defaultLogger as logger } from "@/lib/utils/logger";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getUserSession } from "../session-utils";
import type { SessionInfo } from "../../../types";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

vi.spyOn(logger, "info").mockImplementation(() => {});
vi.spyOn(logger, "error").mockImplementation(() => {});

const mockSessionInfo: SessionInfo = {
  userId: "uuid-12345",
  email: "test@example.com",
  username: "testuser",
  role: "super_admin",
  creditBalance: 500,
  isEnabled: true,
  expiresAt: "2025-12-31T00:00:00Z",
};

const validAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.validtoken";

describe("getUserSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("successful response", () => {
    it("should return SessionInfo on 200 OK response with correct request options", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockSessionInfo),
        headers: new Headers(),
      });

      const result = await getUserSession(validAccessToken);

      expect(result).toEqual(mockSessionInfo);
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
      expect(result?.isEnabled).toBe(false);
    });
  });

  describe("error handling", () => {
    it.each([
      [401, "Unauthorized", "Token expired"],
      [403, "Forbidden", "Account disabled"],
      [404, "Not Found", "Profile not found"],
      [500, "Internal Server Error", "Server error"],
    ])("should return null on HTTP %i", async (status, statusText, text) => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status,
        statusText,
        text: () => Promise.resolve(text),
        headers: new Headers(),
      });

      expect(await getUserSession(validAccessToken)).toBeNull();
    });

    it.each([
      ["network error", new Error("Network error")],
      ["fetch timeout", new Error("AbortError: The operation was aborted.")],
    ])("should return null on %s", async (_, error) => {
      mockFetch.mockRejectedValueOnce(error);
      expect(await getUserSession(validAccessToken)).toBeNull();
    });
  });

  describe("input handling", () => {
    it("should handle empty access token", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: () => Promise.resolve("Missing token"),
        headers: new Headers(),
      });

      const result = await getUserSession("");

      expect(result).toBeNull();
    });
  });
});
