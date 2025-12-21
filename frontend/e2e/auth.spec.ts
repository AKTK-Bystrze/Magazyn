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

  test('should show error for empty email', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByTestId('login-submit-button').click();
    
    // Wait for error to appear
    await expect(page.getByTestId('login-error-alert')).toBeVisible({ timeout: 2000 });
    await expect(page.getByTestId('login-error-alert')).toContainText(/required/i);
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByTestId('login-email-input').fill('invalid-email');
    await page.getByTestId('login-submit-button').click();
    
    // Wait for error to appear
    await expect(page.getByTestId('login-error-alert')).toBeVisible({ timeout: 2000 });
    await expect(page.getByTestId('login-error-alert')).toContainText(/valid email/i);
  });

  test('should show loading state on submit', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByTestId('login-email-input').fill('test@example.com');

    const submitButton = page.getByTestId('login-submit-button');

    // Click and immediately check if it gets disabled
    const clickPromise = submitButton.click();

    // Wait a tiny bit for React to update state
    await page.waitForTimeout(100);

    // Button might briefly be disabled OR show loading spinner
    // Check for either condition
    const isDisabled = await submitButton.isDisabled().catch(() => false);
    const hasSpinner = await page.locator('[data-testid="login-submit-button"] svg.animate-spin').isVisible().catch(() => false);

    expect(isDisabled || hasSpinner).toBeTruthy();
    
    await clickPromise;
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
