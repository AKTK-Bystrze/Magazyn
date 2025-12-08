import type { SessionInfo } from "../../types";

const BACKEND_URL = import.meta.env.PUBLIC_BACKEND_URL || "http://localhost:8080";

/**
 * Fetches the current user's session information from the backend
 * Requires a valid access token
 * @param accessToken - Supabase access token
 * @returns SessionInfo or null if request fails
 */
export async function getUserSession(accessToken: string): Promise<SessionInfo | null> {
  console.log('📡 Fetching user session from backend...');
  console.log('  Backend URL:', BACKEND_URL);
  console.log('  Access Token Length:', accessToken ? accessToken.length : 0);
  console.log('  Access Token Preview:', accessToken ? `${accessToken.substring(0, 20)}...${accessToken.substring(accessToken.length - 10)}` : 'MISSING');

  try {
    const headers = {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };
    console.log('  Request Headers:', {
      ...headers,
      Authorization: headers.Authorization.substring(0, 30) + '...'
    });

    const response = await fetch(`${BACKEND_URL}/auth/session`, {
      method: "GET",
      headers,
      cache: 'no-store' // Ensure we don't get cached stale responses
    });

    console.log('  Response Status:', response.status, response.statusText);
    console.log('  Response Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error("❌ Failed to fetch user session:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("  Error Response Body:", errorText);
      return null;
    }

    const data = await response.json();
    console.log('✅ Session info received:', JSON.stringify(data, null, 2));
    console.log('🔑 Session Response Keys:', Object.keys(data)); // Debug keys
    if (data && typeof data === 'object') {
      console.log(`🧐 isEnabled from backend: ${data.isEnabled} (type: ${typeof data.isEnabled})`);
    }
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
