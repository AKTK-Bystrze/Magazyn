import { test, expect } from './fixtures';

/**
 * Authentication flow e2e tests.
 * Tests login UI, validation, and magic link flow.
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
    
    await expect(page.getByTestId('login-error-alert')).toBeVisible();
    await expect(page.getByTestId('login-error-alert')).toContainText('required');
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByTestId('login-email-input').fill('invalid-email');
    await page.getByTestId('login-submit-button').click();
    
    await expect(page.getByTestId('login-error-alert')).toBeVisible();
    await expect(page.getByTestId('login-error-alert')).toContainText('valid email');
  });

  test('should show loading state on submit', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByTestId('login-email-input').fill('test@example.com');
    
    // Check button state changes on click
    const submitButton = page.getByTestId('login-submit-button');
    await submitButton.click();
    
    // Button should be disabled during loading
    await expect(submitButton).toBeDisabled();
  });
});

test.describe('Authenticated User', () => {
  test('should access dashboard when authenticated', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    
    // Should not redirect to login
    await expect(authenticatedPage).not.toHaveURL(/\/login/);
    
    // Should see navigation elements
    await expect(authenticatedPage.getByTestId('topbar')).toBeVisible();
    await expect(authenticatedPage.getByTestId('user-menu-trigger')).toBeVisible();
  });

  test('should display user menu', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard');
    
    await authenticatedPage.getByTestId('user-menu-trigger').click();
    
    await expect(authenticatedPage.getByTestId('user-menu-dropdown')).toBeVisible();
    await expect(authenticatedPage.getByTestId('logout-button')).toBeVisible();
  });
});
