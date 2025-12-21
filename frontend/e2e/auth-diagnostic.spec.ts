import { test, expect } from './fixtures';

/**
 * Diagnostic test to verify E2E auth setup.
 * 
 * Checks:
 * - Required environment variables are set
 * - `authenticatedPage` fixture creates valid session
 * - Auth cookies are properly injected
 * 
 * Run this standalone to debug authentication issues:
 * `npm run e2e -- auth-diagnostic.spec.ts`
 */
test.describe('Auth Diagnostics', () => {
  test('should verify required environment variables', async () => {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const testEmail = process.env.E2E_TEST_EMAIL;

    expect(supabaseUrl, 'VITE_SUPABASE_URL must be set').toBeTruthy();
    expect(anonKey, 'VITE_SUPABASE_ANON_KEY must be set').toBeTruthy();
    expect(serviceKey, 'SUPABASE_SERVICE_ROLE_KEY must be set').toBeTruthy();
    expect(testEmail, 'E2E_TEST_EMAIL must be set').toBeTruthy();

    console.log('[DIAG] ✅ All required environment variables are set');
  });

  test('should create authenticated page and inject session', async ({ authenticatedPage }) => {
    console.log('[DIAG] Authenticated page created');

    // Navigate to home
    await authenticatedPage.goto('/');
    console.log('[DIAG] Navigated to homepage, URL:', authenticatedPage.url());

    // Check cookies
    const cookies = await authenticatedPage.context().cookies();
    const authCookie = cookies.find(c => c.name === 'magazyn-auth-token');

    expect(authCookie, 'magazyn-auth-token cookie must exist').toBeTruthy();
    console.log('[DIAG] ✅ Auth cookie found');

    // Take screenshot for debugging
    await authenticatedPage.screenshot({ path: 'test-results/auth-diagnostic.png' });
    console.log('[DIAG] ✅ Screenshot saved to test-results/auth-diagnostic.png');
  });
});
