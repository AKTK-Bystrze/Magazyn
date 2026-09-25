import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  AUTH_COOKIE_NAME,
  COOKIE_MAX_AGE,
  setAuthCookie,
  removeAuthCookie,
  getAuthCookie,
  hasAuthCookie,
  waitForCookie,
  waitForCookieAndRedirect,
} from "../cookie-utils";

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

  describe("Constants", () => {
    it("exports correct cookie name", () => {
      expect(AUTH_COOKIE_NAME).toBe("magazyn-auth-token");
    });

    it("exports correct max age (1 year in seconds)", () => {
      const oneYearInSeconds = 60 * 60 * 24 * 365;
      expect(COOKIE_MAX_AGE).toBe(oneYearInSeconds);
      expect(COOKIE_MAX_AGE).toBe(31536000); // 1 year
    });
  });

  describe("setAuthCookie", () => {
    it("sets cookie with correct name and value", () => {
      setAuthCookie("test-token-123");
      expect(mockCookie).toContain("magazyn-auth-token=test-token-123");
    });

    it("sets cookie with path=/", () => {
      setAuthCookie("test-token");
      expect(mockCookie).toContain("path=/");
    });

    it("sets cookie with correct max-age", () => {
      setAuthCookie("test-token");
      expect(mockCookie).toContain(`max-age=${COOKIE_MAX_AGE}`);
    });

    it("sets cookie with SameSite=Lax", () => {
      setAuthCookie("test-token");
      expect(mockCookie).toContain("SameSite=Lax");
    });

    it("sets complete cookie string", () => {
      setAuthCookie("my-access-token");
      expect(mockCookie).toBe(
        `magazyn-auth-token=my-access-token; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`
      );
    });

    it("handles tokens with special characters", () => {
      const token = "abc.def.ghi-123";
      setAuthCookie(token);
      expect(mockCookie).toContain(`magazyn-auth-token=${token}`);
    });

    it("overwrites existing cookie", () => {
      setAuthCookie("old-token");
      expect(mockCookie).toContain("old-token");

      setAuthCookie("new-token");
      expect(mockCookie).toContain("new-token");
      expect(mockCookie).not.toContain("old-token");
    });
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

  describe("getAuthCookie", () => {
    it("returns token when cookie exists", () => {
      mockCookie = "magazyn-auth-token=test-token-123; path=/";
      expect(getAuthCookie()).toBe("test-token-123");
    });

    it("returns token from cookie with multiple cookies", () => {
      mockCookie = "other-cookie=value; magazyn-auth-token=my-token; another=cookie";
      expect(getAuthCookie()).toBe("my-token");
    });

    it("returns null when cookie does not exist", () => {
      mockCookie = "other-cookie=value";
      expect(getAuthCookie()).toBeNull();
    });

    it("returns null when document.cookie is empty", () => {
      mockCookie = "";
      expect(getAuthCookie()).toBeNull();
    });

    it("handles tokens with special characters", () => {
      mockCookie = "magazyn-auth-token=abc.def.ghi-123";
      expect(getAuthCookie()).toBe("abc.def.ghi-123");
    });

    it("handles JWT-like tokens", () => {
      const jwt =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U";
      mockCookie = `magazyn-auth-token=${jwt}`;
      expect(getAuthCookie()).toBe(jwt);
    });
  });

  describe("hasAuthCookie", () => {
    it("returns true when cookie exists", () => {
      mockCookie = "magazyn-auth-token=some-token";
      expect(hasAuthCookie()).toBe(true);
    });

    it("returns false when cookie does not exist", () => {
      mockCookie = "other-cookie=value";
      expect(hasAuthCookie()).toBe(false);
    });

    it("returns false when document.cookie is empty", () => {
      mockCookie = "";
      expect(hasAuthCookie()).toBe(false);
    });

    it("returns true even if token value is empty", () => {
      mockCookie = "magazyn-auth-token=";
      expect(hasAuthCookie()).toBe(true);
    });

    it("detects cookie among multiple cookies", () => {
      mockCookie = "first=1; magazyn-auth-token=token; last=2";
      expect(hasAuthCookie()).toBe(true);
    });
  });

  describe("waitForCookie", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("resolves immediately if cookie is already set", async () => {
      mockCookie = "magazyn-auth-token=token";
      const promise = waitForCookie(300);
      await vi.runAllTimersAsync();
      const result = await promise;
      expect(result).toBe(true);
    });

    it("resolves when cookie is set during wait", async () => {
      const promise = waitForCookie(300);

      // Advance half way and set cookie
      await vi.advanceTimersByTimeAsync(100);
      mockCookie = "magazyn-auth-token=test-token";
      await vi.advanceTimersByTimeAsync(50);

      const result = await promise;
      expect(result).toBe(true);
    });

    it("returns false when timeout expires without cookie", async () => {
      mockCookie = "";
      const promise = waitForCookie(100);
      await vi.advanceTimersByTimeAsync(150);
      const result = await promise;
      expect(result).toBe(false);
    });

    it("uses default timeout of 300ms", async () => {
      mockCookie = "";
      const promise = waitForCookie();

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(290);
      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(20);
      expect(resolved).toBe(true);
    });

    it("accepts custom timeout", async () => {
      mockCookie = "";
      const promise = waitForCookie(150);

      let resolved = false;
      promise.then(() => {
        resolved = true;
      });

      await vi.advanceTimersByTimeAsync(140);
      expect(resolved).toBe(false);

      await vi.advanceTimersByTimeAsync(20);
      expect(resolved).toBe(true);
    });
  });

  describe("waitForCookieAndRedirect", () => {
    let mockReplace: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      vi.useFakeTimers();
      mockReplace = vi.fn();
      vi.stubGlobal("window", {
        ...window,
        location: {
          ...window.location,
          replace: mockReplace,
        },
      });
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    });

    it("sets cookie before redirecting", async () => {
      const promise = waitForCookieAndRedirect("test-token", "/dashboard");

      await vi.advanceTimersByTimeAsync(150); // fast forward to let cookie be verified
      await promise;

      expect(mockCookie).toContain("magazyn-auth-token=test-token");
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });

    it("handles different redirect URLs", async () => {
      const promise1 = waitForCookieAndRedirect("token1", "/admin");
      await vi.advanceTimersByTimeAsync(150);
      await promise1;
      expect(mockReplace).toHaveBeenCalledWith("/admin");

      mockReplace.mockClear();

      const promise2 = waitForCookieAndRedirect("token2", "/dashboard");
      await vi.advanceTimersByTimeAsync(150);
      await promise2;
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Integration Tests", () => {
    it("completes full cookie lifecycle", async () => {
      setAuthCookie("my-token");
      expect(hasAuthCookie()).toBe(true);
      expect(getAuthCookie()).toBe("my-token");

      await expect(waitForCookie(100)).resolves.toBe(true);

      removeAuthCookie();
      expect(hasAuthCookie()).toBe(false);
      expect(getAuthCookie()).toBeNull();
    });

    it("handles cookie update flow", async () => {
      setAuthCookie("old-token");
      expect(getAuthCookie()).toBe("old-token");

      setAuthCookie("new-token");
      expect(getAuthCookie()).toBe("new-token");
      expect(getAuthCookie()).not.toBe("old-token");
    });
  });

  describe("Security Considerations", () => {
    it("includes SameSite=Lax for CSRF protection", () => {
      setAuthCookie("token");
      expect(mockCookie).toContain("SameSite=Lax");
    });

    it("sets cookie path to / for site-wide availability", () => {
      setAuthCookie("token");
      expect(mockCookie).toContain("path=/");
    });

    it("uses appropriate max-age for long-lived sessions", () => {
      setAuthCookie("token");
      expect(mockCookie).toContain("max-age=31536000");
    });
  });
});
