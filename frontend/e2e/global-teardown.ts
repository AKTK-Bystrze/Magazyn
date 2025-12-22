import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { cleanupOrphanedTestEquipment } from './helpers/data-setup.helper';

/**
 * Global teardown for E2E tests.
 * Runs once after all tests complete.
 * 
 * Cleans up any orphaned test equipment from failed test runs.
 */

async function globalTeardown() {
  console.log('\n[GLOBAL TEARDOWN] Starting cleanup...\n');

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[GLOBAL TEARDOWN] ⚠️ Missing environment variables, skipping cleanup');
    return;
  }

  const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    const deletedCount = await cleanupOrphanedTestEquipment(supabaseAdmin);
    
    if (deletedCount > 0) {
      console.log(`\n[GLOBAL TEARDOWN] ✅ Cleanup complete: ${deletedCount} items removed\n`);
    } else {
      console.log('\n[GLOBAL TEARDOWN] ✅ No cleanup needed\n');
    }
  } catch (error) {
    console.error('[GLOBAL TEARDOWN] ❌ Cleanup failed:', error);
  }
}

export default globalTeardown;
