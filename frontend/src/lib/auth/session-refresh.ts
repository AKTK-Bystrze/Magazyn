// frontend/src/lib/auth/session-refresh.ts
// SERVER ONLY — handles concurrency deduplication and grace-period caching for token refreshes
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MagazynSession } from "./session-store";

export type RefreshResult =
  | { success: true; session: MagazynSession }
  | { success: false; isRevoked: boolean; error?: string };

// In-flight refresh promises mapped by userId
const activeRefreshes = new Map<string, Promise<RefreshResult>>();

// Recently rotated tokens mapped by oldRefreshToken -> newSession (30s grace window)
const recentRefreshes = new Map<string, MagazynSession>();

/**
 * Executes or deduplicates a server-side session token refresh via Supabase.
 *
 * Prevents race conditions when multiple concurrent requests (e.g. SSR page + React island fetches)
 * arrive with the same expired token after hours of user inactivity.
 *
 * @param session - Current decrypted session
 * @param supabase - Supabase client instance
 * @returns Result with refreshed session or error classification
 */
export async function refreshUserSession(
  session: MagazynSession,
  supabase: SupabaseClient
): Promise<RefreshResult> {
  // 1. Check if this exact refresh token was already rotated during the grace period
  const cached = recentRefreshes.get(session.refreshToken);
  if (cached) {
    return { success: true, session: cached };
  }

  // 2. Check if a refresh for this user is already in flight
  const existingPromise = activeRefreshes.get(session.userId);
  if (existingPromise) {
    return existingPromise;
  }

  // 3. Initiate single-flight refresh
  const refreshPromise = (async (): Promise<RefreshResult> => {
    try {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: session.refreshToken,
      });

      if (error || !data.session) {
        const authErr = error as { code?: string; message?: string; status?: number } | null;
        const isRevoked =
          Boolean(error) &&
          ((authErr?.status !== undefined && authErr.status >= 400 && authErr.status < 500) ||
            /revoked|expired|not_found|invalid/i.test(`${authErr?.code} ${authErr?.message}`));

        return {
          success: false,
          isRevoked,
          error: error?.message || "Token refresh failed",
        };
      }

      const newSession: MagazynSession = {
        userId: session.userId,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
      };

      // Store in grace cache under old refresh token with auto-eviction
      recentRefreshes.set(session.refreshToken, newSession);
      setTimeout(() => recentRefreshes.delete(session.refreshToken), 30_000).unref?.();

      return { success: true, session: newSession };
    } catch (err: unknown) {
      return {
        success: false,
        isRevoked: false,
        error: err instanceof Error ? err.message : String(err),
      };
    } finally {
      activeRefreshes.delete(session.userId);
    }
  })();

  activeRefreshes.set(session.userId, refreshPromise);
  return refreshPromise;
}

/**
 * Resets internal single-flight and cache state.
 * Strictly for test isolation.
 */
export function clearRefreshStateForTesting(): void {
  activeRefreshes.clear();
  recentRefreshes.clear();
}
