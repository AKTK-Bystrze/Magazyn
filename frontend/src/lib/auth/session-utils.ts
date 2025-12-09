import type { SessionInfo } from "../../types";
import { BACKEND_URL } from "../config/api";

/**
 * Fetches the current user's session information from the backend
 * Requires a valid access token
 * @param accessToken - Supabase access token
 * @returns SessionInfo or null if request fails
 */
export async function getUserSession(accessToken: string): Promise<SessionInfo | null> {

  try {
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(`${BACKEND_URL}/auth/session`, {
      method: "GET",
      headers,
      cache: 'no-store' // Ensure we don't get cached stale responses
    });
    
    if (!response.ok) {
      console.error("❌ Failed to fetch user session:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("  Error Response Body:", errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Session info received:', JSON.stringify(data, null, 2));
    return data as SessionInfo;
  } catch (error) {
    console.error("❌ Exception fetching user session:", error);
    if (error instanceof Error) {
      console.error("  Error Message:", error.message);
      console.error("  Error Stack:", error.stack);
    }
    return null;
  }
}
