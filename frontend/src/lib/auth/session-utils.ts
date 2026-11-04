import type { SessionInfo } from "../../types";
import { BACKEND_URL } from "../config/api";
import { defaultLogger as logger } from "@/lib/utils/logger";

export type SessionFetchResult =
  | { status: "ok"; sessionInfo: SessionInfo }
  | { status: "unauthorized" }
  | { status: "unavailable"; error: string };

/**
 * Fetches the user session from the backend with detailed status differentiation.
 *
 * Distinguishes between genuine token invalidation (401 Unauthorized) and transient
 * backend/network unavailability (5xx, timeouts, connection refused) to prevent
 * accidental session deletion during service hiccups.
 *
 * @param accessToken - Supabase access token
 * @returns Structured result indicating ok, unauthorized, or unavailable
 */
export async function fetchUserSessionDetails(accessToken: string): Promise<SessionFetchResult> {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const url = `${BACKEND_URL}/auth/session`;

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (response.ok) {
      const data = (await response.json()) as SessionInfo;
      return { status: "ok", sessionInfo: data };
    }

    if (response.status === 401) {
      return { status: "unauthorized" };
    }

    const errorText = await response.text().catch(() => "");
    logger.error("❌ Backend session check unavailable", {
      status: response.status,
      statusText: response.statusText,
      errorText,
    });

    return {
      status: "unavailable",
      error: `Backend returned ${response.status}: ${errorText}`,
    };
  } catch (error) {
    logger.error("❌ Exception fetching user session", { error });
    return {
      status: "unavailable",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Fetches the current user's session information from the backend
 * Requires a valid access token
 * @param accessToken - Supabase access token
 * @returns SessionInfo or null if request fails
 */
export async function getUserSession(accessToken: string): Promise<SessionInfo | null> {
  const result = await fetchUserSessionDetails(accessToken);
  return result.status === "ok" ? result.sessionInfo : null;
}
