import { test, expect } from './fixtures';

/**
 * Authentication flow e2e tests.
 * Tests login UI, validation, and authenticated user access.
 *
 * Authentication is handled by the `authenticatedPage` fixture which:
 * 1. Creates/updates a test user via Supabase Admin API (with password)
 * 2. Signs in via `signInWithPassword` to get real JWT tokens
 * 3. Injects session into browser localStorage and cookies
 *
 * @see fixtures/index.ts for authentication implementation
 */

test.describe('Login Page', () => {
  test('should display login form', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByTestId('login-email-input')).toBeVisible();
    await expect(page.getByTestId('login-submit-button')).toBeVisible();
  });


});

/**
 * Authenticated user tests.
 * Uses `authenticatedPage` fixture for automatic session injection.
 */
test.describe('Authenticated User', () => {
  test('should access dashboard when authenticated', async ({ authenticatedPage }) => {
    console.log('[TEST] Starting authenticated dashboard access test');
    console.log('[TEST] Current URL before navigation:', authenticatedPage.url());

    await authenticatedPage.goto('/dashboard');
    
    console.log('[TEST] Current URL after navigation:', authenticatedPage.url());

    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/\/login/);
    
    // Should see navigation elements
    console.log('[TEST] Checking for topbar...');
    await expect(authenticatedPage.getByTestId('topbar')).toBeVisible();
    console.log('[TEST] Topbar visible');

    console.log('[TEST] Checking for user menu...');
    await expect(authenticatedPage.getByTestId('user-menu-trigger')).toBeVisible();
    console.log('[TEST] User menu visible');

    console.log('[TEST] Dashboard access test complete');
  });

  test('should display user menu', async ({ authenticatedPage }) => {
    console.log('[TEST] Starting user menu test');
    console.log('[TEST] Current URL:', authenticatedPage.url());

    await authenticatedPage.goto('/dashboard');
    console.log('[TEST] Navigated to dashboard, URL:', authenticatedPage.url());

    console.log('[TEST] Looking for user menu trigger...');
    const userMenuTrigger = authenticatedPage.getByTestId('user-menu-trigger');
    await expect(userMenuTrigger).toBeVisible();
    console.log('[TEST] User menu trigger found and visible');
    
    console.log('[TEST] Clicking user menu...');
    await userMenuTrigger.click();
    console.log('[TEST] User menu clicked');
    
    console.log('[TEST] Waiting for dropdown...');
    await expect(authenticatedPage.getByTestId('user-menu-dropdown')).toBeVisible();
    console.log('[TEST] Dropdown visible');

    await expect(authenticatedPage.getByTestId('logout-button')).toBeVisible();
    console.log('[TEST] Logout button visible');

    console.log('[TEST] User menu test complete');
  });
});
