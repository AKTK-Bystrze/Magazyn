import type { Session, User } from "@supabase/supabase-js";
import type { SessionInfo } from "@/types";

/**
 * Creates a mock Supabase User object.
 *
 * @param overrides - Optional overrides for the mock user.
 * @returns Mock User instance.
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: "test-user-id",
    email: "test@example.com",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
    ...overrides,
  } as User;
}

/**
 * Creates a mock Supabase Session object.
 *
 * @param overrides - Optional overrides for the mock session.
 * @returns Mock Session instance.
 */
export function createMockSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: "mock-access-token",
    refresh_token: "mock-refresh-token",
    expires_in: 3600,
    expires_at: Date.now() + 3600000,
    token_type: "bearer",
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Creates a mock SessionInfo object.
 *
 * @param overrides - Optional overrides for the mock session info.
 * @returns Mock SessionInfo instance.
 */
export function createMockSessionInfo(overrides: Partial<SessionInfo> = {}): SessionInfo {
  return {
    userId: "test-user-id",
    email: "test@example.com",
    username: "testuser",
    isEnabled: true,
    role: "user",
    creditBalance: 100,
    expiresAt: "2025-12-31T00:00:00Z",
    ...overrides,
  };
}
