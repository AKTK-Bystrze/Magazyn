// This file should export the Supabase client for server-side usage
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Warn but don't crash, might be build time
  console.warn("Missing Supabase env vars in supabase.client.ts");
}

export const supabaseClient = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false,
  }
});
