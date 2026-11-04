import type { SessionInfo } from "../../types";
import { BACKEND_URL } from "../config/api";
import { defaultLogger as logger } from "@/lib/utils/logger";

export type SessionFetchResult =
  | { status: "ok"; sessionInfo: SessionInfo }
  | { status: "unauthorized" }
  | { status: "unavailable"; error: string };

/**
 * Fetches the user session from the backend with status differentiation.
 *
 * @param accessToken - Supabase access token
 * @returns Structured result indicating ok, unauthorized, or unavailable
 */
export async function getUserSession(accessToken: string): Promise<SessionFetchResult> {
  try {
    const response = await fetch(`${BACKEND_URL}/auth/session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (response.ok) {
      return { status: "ok", sessionInfo: (await response.json()) as SessionInfo };
    }

    if (response.status === 401) {
      return { status: "unauthorized" };
    }

    const errorText = await response.text().catch(() => "");
    logger.error("❌ Backend session check unavailable", {
      status: response.status,
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
