import { type Page } from '@playwright/test';

/**
 * Authentication helper functions for e2e tests.
 * Provides utilities for login flow testing and session management.
 */

/**
 * Navigates to login page and submits email for magic link.
 * Use for testing the login UI flow (not for authentication setup).
 * 
 * @param page - Playwright page instance
 * @param email - Email address to submit
 */
export async function submitLoginEmail(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-submit-button').click();
}

/**
 * Waits for magic link sent confirmation to appear.
 * 
 * @param page - Playwright page instance
 */
export async function waitForMagicLinkSent(page: Page): Promise<void> {
  await page.getByTestId('magic-link-sent-container').waitFor({ state: 'visible' });
}

/**
 * Performs logout by clicking the logout button in user menu.
 * 
 * @param page - Playwright page instance
 */
export async function logout(page: Page): Promise<void> {
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('logout-button').click();
  
  // Wait for redirect to login page
  await page.waitForURL('**/login');
}

/**
 * Verifies user is logged in by checking for navigation elements.
 * 
 * @param page - Playwright page instance
 */
export async function verifyLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.getByTestId('user-menu-trigger').waitFor({ state: 'visible', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
