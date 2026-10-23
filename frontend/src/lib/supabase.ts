import { createBrowserClient } from "@supabase/ssr";
import { defaultLogger as logger } from "@/lib/utils/logger";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error("❌ Missing Supabase environment variables", {
    url: supabaseUrl,
    hasKey: !!supabaseAnonKey,
  });
  throw new Error("Missing required Supabase environment variables");
}

/**
 * Supabase browser client configured for SSR compatibility
 *
 * Uses @supabase/ssr's createBrowserClient for automatic cookie management.
 * This ensures session synchronization between client-side and server-side (middleware).
 *
 * The client automatically:
 * - Manages authentication cookies (sb-*-auth-token)
 * - Handles PKCE flow for magic links
 * - Syncs session state across tabs
 * - Refreshes tokens automatically
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    name: "sb-magazyn-auth-token",
  },
});
