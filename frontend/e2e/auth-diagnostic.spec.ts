import { test, expect } from './fixtures';
import { createClient } from '@supabase/supabase-js';

/**
 * Comprehensive diagnostic tests to verify E2E auth setup.
 *
 * Checks:
 * - Required environment variables are set
 * - Admin client connectivity (service role key)
 * - Test user existence and email confirmation
 * - Password-based sign-in works
 * - `authenticatedPage` fixture creates valid session
 * - Auth cookies are properly injected
 *
 * Run standalone to debug authentication issues:
 * `npm run e2e -- auth-diagnostic.spec.ts`
 */
test.describe('Auth Diagnostics', () => {
  test('should verify required environment variables', async () => {
    console.log('========================================');
    console.log('ENVIRONMENT VARIABLE CHECK');
    console.log('========================================');

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

    expect(supabaseUrl, 'VITE_SUPABASE_URL must be set').toBeTruthy();
    expect(anonKey, 'VITE_SUPABASE_ANON_KEY must be set').toBeTruthy();
    expect(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY must be set').toBeTruthy();
    expect(testEmail, 'E2E_TEST_EMAIL must be set').toBeTruthy();

    console.log('[DIAG] ✅ All required environment variables are set');
  });

  test('should verify admin client and test user', async () => {
    console.log('========================================');
    console.log('ADMIN CLIENT & USER CHECK');
    console.log('========================================');

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const testEmail = process.env.E2E_TEST_EMAIL!;

    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (listError) {
      console.log('❌ Failed to list users:', listError.message);
      throw listError;
    }

    console.log('✅ Admin client works!');
    console.log(`Found ${users.users.length} users in database`);

    const testUser = users.users.find((u) => u.email === testEmail);

    if (testUser) {
      console.log('✅ Test user exists:', testUser.id);
      console.log('   Email confirmed:', testUser.email_confirmed_at ? '✅ Yes' : '❌ No');
    } else {
      console.log('⚠️  Test user NOT found - will be created on first test run');
    }

    expect(users.users.length).toBeGreaterThan(0);
  });

  test('should verify password sign-in works', async () => {
    console.log('========================================');
    console.log('SIGN-IN TEST');
    console.log('========================================');

    const supabaseUrl = process.env.VITE_SUPABASE_URL!;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY!;
    const testEmail = process.env.E2E_TEST_EMAIL!;
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!';

    const client = createClient(supabaseUrl, anonKey);

    const { data, error } = await client.auth.signInWithPassword({
      email: testEmail,
      password: testPassword,
    });

    if (error) {
      console.log('❌ Sign in failed:', error.message);
      console.log('💡 Run the e2e tests once to auto-create the user');
      throw error;
    }

    console.log('✅ Sign in successful!');
    console.log('   User ID:', data.user!.id);

    expect(data.session).toBeTruthy();
    expect(data.user).toBeTruthy();
  });

  test('should create authenticated page and inject session', async ({ authenticatedPage }) => {
    console.log('========================================');
    console.log('SESSION INJECTION TEST');
    console.log('========================================');

    console.log('[DIAG] Authenticated page created');

    await authenticatedPage.goto('/');
    console.log('[DIAG] Navigated to homepage, URL:', authenticatedPage.url());

    const cookies = await authenticatedPage.context().cookies();
    const authCookie = cookies.find((c) => c.name === 'magazyn-auth-token');

    expect(authCookie, 'magazyn-auth-token cookie must exist').toBeTruthy();
    console.log('[DIAG] ✅ Auth cookie found');

    await authenticatedPage.screenshot({ path: 'test-results/auth-diagnostic.png' });
    console.log('[DIAG] ✅ Screenshot saved to test-results/auth-diagnostic.png');

    console.log('========================================');
    console.log('✅ ALL DIAGNOSTICS PASSED!');
    console.log('========================================');
  });
});
