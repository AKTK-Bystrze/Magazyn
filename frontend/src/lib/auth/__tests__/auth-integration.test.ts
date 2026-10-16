import { describe, it, expect, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { getUserSession } from "@/lib/auth/session-utils";
import { RedirectManager } from "@/lib/auth/redirect-manager";
import { isSafeRedirect } from "@/lib/auth/url-utils";
import type { SessionInfo } from "@/types";

/**
 * Simple Integration Tests
 *
 * Purpose: Verify that auth utilities work together correctly
 * Scope: Minimal mocking, focus on module integration
 *
 * Note: This is NOT a replacement for unit tests. These tests verify
 * that the modules integrate properly with each other.
 */

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Auth Integration Tests", () => {
  it("fetches session and resolves safe auth redirect", async () => {
    const mockSession: SessionInfo = {
      userId: "user-123",
      email: "test@example.com",
      username: "testuser",
      role: "user",
      isEnabled: true,
      creditBalance: 100,
      expiresAt: "2025-12-31T00:00:00Z",
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockSession),
      headers: new Headers(),
    });

    const session = await getUserSession("mock-access-token");
    const mockUser = { id: "user-123", email: "test@example.com" } as unknown as User;
    const redirect = RedirectManager.getRedirectForAuthState(
      mockUser,
      session,
      "/login",
      "https://evil.com/steal-data",
      "http://localhost:4321"
    );

    expect(redirect).toBe("/dashboard");
    expect(isSafeRedirect(redirect!, "http://localhost:4321")).toBe(true);
  });
});
