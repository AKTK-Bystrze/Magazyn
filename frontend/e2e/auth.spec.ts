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
    await authenticatedPage.goto('/dashboard');

    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/\/login/);

    // Should see navigation elements
    await expect(authenticatedPage.getByTestId('topbar')).toBeVisible();
    await expect(authenticatedPage.getByTestId('user-menu-trigger')).toBeVisible();
  });
});
