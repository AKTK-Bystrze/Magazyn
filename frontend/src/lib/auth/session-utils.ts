import type { SessionInfo } from "../../types";
import { BACKEND_URL } from "../config/api";
import { defaultLogger as logger } from "@/lib/utils/logger";

/**
 * Fetches the current user's session information from the backend
 * Requires a valid access token
 * @param accessToken - Supabase access token
 * @returns SessionInfo or null if request fails
 */
export async function getUserSession(accessToken: string): Promise<SessionInfo | null> {
  try {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const url = `${BACKEND_URL}/auth/session`;

    const response = await fetch(url, {
      method: "GET",
      headers,
      cache: "no-store", // Ensure we don't get cached stale responses
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error("❌ Failed to fetch user session", {
        status: response.status,
        statusText: response.statusText,
        errorText,
      });
      return null;
    }

    const data = await response.json();
    return data as SessionInfo;
  } catch (error) {
    logger.error("❌ Exception fetching user session", { error });
    return null;
  }
}
