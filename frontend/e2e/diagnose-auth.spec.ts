import { test } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Standalone diagnostic to verify Supabase auth configuration.
 * 
 * Checks:
 * - All required environment variables
 * - Admin client connectivity (service role key)
 * - Test user existence and email confirmation
 * - Password-based sign-in works
 * 
 * Run standalone: `npm run e2e -- diagnose-auth.spec.ts`
 */
test('diagnose auth setup', async () => {
  console.log('========================================');
  console.log('SUPABASE AUTH DIAGNOSTIC');
  console.log('========================================');

  // Check environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const testEmail = process.env.E2E_TEST_EMAIL;
  const testPassword = process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!';

  console.log('VITE_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('VITE_SUPABASE_ANON_KEY:', anonKey ? '✅ Set' : '❌ Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? '✅ Set' : '❌ Missing');
  console.log('E2E_TEST_EMAIL:', testEmail || '❌ Missing');
  console.log('E2E_TEST_PASSWORD:', testPassword ? '✅ Set' : '❌ Missing');

  if (!supabaseUrl || !anonKey || !serviceKey || !testEmail) {
    throw new Error('Missing required environment variables');
  }

  // Test admin client
  console.log('\n--- Testing Admin Client ---');
  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: users, error: listError } = await adminClient.auth.admin.listUsers();

  if (listError) {
    console.log('❌ Failed to list users:', listError.message);
    throw listError;
  }

  console.log('✅ Admin client works!');
  console.log(`Found ${users.users.length} users in database`);

  // Check test user
  const testUser = users.users.find(u => u.email === testEmail);

  if (testUser) {
    console.log('✅ Test user exists:', testUser.id);
    console.log('   Email confirmed:', testUser.email_confirmed_at ? '✅ Yes' : '❌ No');
  } else {
    console.log('⚠️  Test user NOT found - will be created on first test run');
  }

  // Test sign in
  console.log('\n--- Testing Sign In ---');
  const client = createClient(supabaseUrl, anonKey);

  const { data, error } = await client.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (error) {
    console.log('❌ Sign in failed:', error.message);
    if (!testUser) {
      console.log('\n💡 Run the e2e tests once to auto-create the user');
    }
    throw error;
  }

  console.log('✅ Sign in successful!');
  console.log('   User ID:', data.user!.id);

  console.log('\n========================================');
  console.log('✅ ALL CHECKS PASSED!');
  console.log('========================================');
});
