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
    // Reset cookie
    mockCookie = "";

    // Mock document.cookie
    Object.defineProperty(document, "cookie", {
      get: () => mockCookie,
      set: (value: string) => {
        // Parse and update mockCookie
        if (value.includes("max-age=0")) {
          // Cookie is being cleared
          const cookieName = value.split("=")[0];
          mockCookie = mockCookie
            .split("; ")
            .filter((c) => !c.startsWith(cookieName))
            .join("; ");
        } else {
          // Cookie is being set
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

      // The mock should clear the cookie
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
    it("resolves immediately if cookie is already set", async () => {
      mockCookie = "magazyn-auth-token=token";
      const result = await waitForCookie(300);
      expect(result).toBe(true);
    });

    it("resolves when cookie is set during wait", async () => {
      const promise = waitForCookie(300);

      // Set cookie after 100ms
      setTimeout(() => {
        mockCookie = "magazyn-auth-token=test-token";
      }, 100);

      const result = await promise;
      expect(result).toBe(true);
    });

    it("returns false when timeout expires without cookie", async () => {
      mockCookie = "";
      const result = await waitForCookie(100);
      expect(result).toBe(false);
    });

    it("uses default timeout of 300ms", async () => {
      const startTime = Date.now();
      await waitForCookie();
      const elapsed = Date.now() - startTime;

      // Should take around 300ms (timeout) since cookie was never set
      expect(elapsed).toBeGreaterThanOrEqual(280);
      expect(elapsed).toBeLessThan(400); // Increased tolerance for test environment
    });

    it("accepts custom timeout", async () => {
      const startTime = Date.now();
      await waitForCookie(150);
      const elapsed = Date.now() - startTime;

      // Should take around 150ms
      expect(elapsed).toBeGreaterThanOrEqual(130);
      expect(elapsed).toBeLessThan(250);
    });

    it("polls for cookie presence and succeeds when cookie appears", async () => {
      // Start with no cookie
      mockCookie = "";

      // Set cookie after 100ms to simulate async cookie setting
      setTimeout(() => {
        mockCookie = "magazyn-auth-token=delayed-token";
      }, 100);

      const result = await waitForCookie(300);

      // Should have succeeded because cookie appeared during wait period
      expect(result).toBe(true);
    });
  });

  describe("waitForCookieAndRedirect", () => {
    let mockReplace: ReturnType<typeof vi.fn>;

    beforeEach(() => {
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
      vi.unstubAllGlobals();
    });

    it("sets cookie before redirecting", async () => {
      const promise = waitForCookieAndRedirect("test-token", "/dashboard");

      // Wait for cookie to be set
      await vi.waitFor(() => {
        expect(mockCookie).toContain("magazyn-auth-token=test-token");
      });

      await promise;
    });

    it("performs redirect after cookie is set", async () => {
      await waitForCookieAndRedirect("test-token", "/admin");

      expect(mockReplace).toHaveBeenCalledWith("/admin");
    });

    it("waits for cookie confirmation before redirecting", async () => {
      const promise = waitForCookieAndRedirect("test-token", "/dashboard");

      // Redirect should not happen immediately
      expect(mockReplace).not.toHaveBeenCalled();

      await promise;

      // Redirect should happen after wait
      expect(mockReplace).toHaveBeenCalled();
    });

    it("waits additional time if cookie not set after 100ms", async () => {
      // Simulate slow cookie setting

      Object.defineProperty(document, "cookie", {
        get: () => mockCookie,
        set: (value: string) => {
          setTimeout(() => {
            mockCookie = value;
          }, 150); // Delay cookie setting
        },
        configurable: true,
      });

      const startTime = Date.now();
      await waitForCookieAndRedirect("test-token", "/dashboard");
      const elapsed = Date.now() - startTime;

      // Should wait full 300ms (100ms + 200ms backup wait)
      expect(elapsed).toBeGreaterThanOrEqual(280);
    });

    it("handles different redirect URLs", async () => {
      await waitForCookieAndRedirect("token1", "/admin");
      expect(mockReplace).toHaveBeenCalledWith("/admin");

      mockReplace.mockClear();

      await waitForCookieAndRedirect("token2", "/dashboard");
      expect(mockReplace).toHaveBeenCalledWith("/dashboard");
    });
  });

  describe("Integration Tests", () => {
    it("completes full cookie lifecycle", async () => {
      // Set cookie
      setAuthCookie("my-token");
      expect(hasAuthCookie()).toBe(true);
      expect(getAuthCookie()).toBe("my-token");

      // Check cookie
      await expect(waitForCookie(100)).resolves.toBe(true);

      // Remove cookie
      removeAuthCookie();
      expect(hasAuthCookie()).toBe(false);
      expect(getAuthCookie()).toBeNull();
    });

    it("handles cookie update flow", async () => {
      // Set initial cookie
      setAuthCookie("old-token");
      expect(getAuthCookie()).toBe("old-token");

      // Update cookie
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
      // 1 year is reasonable for remember-me functionality
      expect(mockCookie).toContain("max-age=31536000");
    });
  });
});
