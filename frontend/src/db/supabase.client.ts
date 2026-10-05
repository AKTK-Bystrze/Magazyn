import { createClient } from "@supabase/supabase-js";
import { defaultLogger as logger } from "@/lib/utils/logger";

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  import.meta.env.PUBLIC_SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.warn("Missing Supabase env vars in supabase.client.ts");
}

export const supabaseClient = createClient(supabaseUrl || "", supabaseAnonKey || "", {
  auth: {
    flowType: "pkce",
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  },
});
