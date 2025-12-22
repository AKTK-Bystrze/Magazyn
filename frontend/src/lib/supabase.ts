import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

console.log('🔧 Supabase Client Configuration:');
console.log('  URL:', supabaseUrl);
console.log('  Anon Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'MISSING');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('  PUBLIC_SUPABASE_URL:', supabaseUrl);
  console.error('  PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'present' : 'MISSING');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    // IMPORTANT: detectSessionInUrl must be false because AuthListener 
    // manually processes the URL hash. Setting this to true causes race 
    // conditions where both Supabase and AuthListener try to process the hash.
    detectSessionInUrl: false,
    persistSession: true,
    storageKey: 'magazyn-auth-token',
  }
});
