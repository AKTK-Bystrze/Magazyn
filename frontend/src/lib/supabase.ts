import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Browser Client Configuration:');
console.log('  URL:', supabaseUrl);
console.log('  Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('  PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('  PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'present' : 'MISSING');
  throw new Error('Missing required Supabase environment variables');
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
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
