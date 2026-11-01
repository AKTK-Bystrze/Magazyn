import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  encryptSession,
  decryptSession,
  clearAllCookies,
  SESSION_COOKIE,
  type MagazynSession,
} from "../session-store";

const TEST_KEY = "a".repeat(64); // 32 bytes (hex) — valid AES-256 key material

const mockSession: MagazynSession = {
  userId: "user-123",
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
};

describe("session-store", () => {
  const originalKey = process.env.SESSION_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.SESSION_ENCRYPTION_KEY = TEST_KEY;
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.SESSION_ENCRYPTION_KEY;
    } else {
      process.env.SESSION_ENCRYPTION_KEY = originalKey;
    }
  });

  it("encrypts and decrypts a session round-trip", async () => {
    const encrypted = await encryptSession(mockSession);
    expect(encrypted).toContain(":");

    const decrypted = await decryptSession(encrypted);
    expect(decrypted).toEqual(mockSession);
  });

  it("produces opaque ciphertext that never contains the session payload", async () => {
    const encrypted = await encryptSession(mockSession);
    expect(encrypted).not.toContain("access-token");
    expect(encrypted).not.toContain("refresh-token");
    expect(encrypted).not.toContain("user-123");
  });

  it("returns null for a tampered cookie", async () => {
    const encrypted = await encryptSession(mockSession);
    const tampered = encrypted.slice(0, -4) + "AAAA";

    expect(await decryptSession(tampered)).toBeNull();
  });

  it("returns null for malformed cookie values", async () => {
    expect(await decryptSession("")).toBeNull();
    expect(await decryptSession("no-colon")).toBeNull();
    expect(await decryptSession("a:b")).toBeNull();
  });

  it("returns null when the cookie was encrypted with a different key", async () => {
    const encrypted = await encryptSession(mockSession);

    process.env.SESSION_ENCRYPTION_KEY = "b".repeat(64);
    expect(await decryptSession(encrypted)).toBeNull();
  });

  it("throws when the encryption key is missing or too short", async () => {
    delete process.env.SESSION_ENCRYPTION_KEY;
    await expect(encryptSession(mockSession)).rejects.toThrow("SESSION_ENCRYPTION_KEY");

    process.env.SESSION_ENCRYPTION_KEY = "short";
    await expect(encryptSession(mockSession)).rejects.toThrow("SESSION_ENCRYPTION_KEY");
  });

  it("exposes the expected HttpOnly cookie name", () => {
    expect(SESSION_COOKIE).toBe("magazyn_sid");
  });

  describe("clearAllCookies", () => {
    it("deletes all cookies found in the request header and the session cookie", () => {
      const mockDelete = vi.fn();
      const mockCookies = { delete: mockDelete };
      const request = new Request("http://localhost", {
        headers: {
          cookie: "custom_a=123; magazyn_sid=abc; other_val=xyz",
        },
      });

      clearAllCookies(request, mockCookies);

      expect(mockDelete).toHaveBeenCalledWith("custom_a", { path: "/" });
      expect(mockDelete).toHaveBeenCalledWith("magazyn_sid", { path: "/" });
      expect(mockDelete).toHaveBeenCalledWith("other_val", { path: "/" });
      expect(mockDelete).toHaveBeenCalledTimes(3);
    });

    it("always deletes the session cookie even if no cookie header is present", () => {
      const mockDelete = vi.fn();
      const mockCookies = { delete: mockDelete };
      const request = new Request("http://localhost");

      clearAllCookies(request, mockCookies);

      expect(mockDelete).toHaveBeenCalledWith(SESSION_COOKIE, { path: "/" });
      expect(mockDelete).toHaveBeenCalledTimes(1);
    });
  });
});
