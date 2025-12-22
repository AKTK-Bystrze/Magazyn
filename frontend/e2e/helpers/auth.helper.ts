import { type Page } from '@playwright/test';
import { E2E_CONFIG } from '../constants';

/**
 * Authentication helper functions for e2e tests.
 * Provides utilities for login flow testing and session management.
 */

/**
 * Navigates to the login page and submits the email form.
 *
 * @param page - The Playwright Page instance.
 * @param email - The email address to try logging in with.
 * @returns A promise that resolves when the submit button has been clicked.
 */
export async function submitLoginEmail(page: Page, email: string): Promise<void> {
  await page.goto('/login');
  await page.getByTestId('login-email-input').fill(email);
  await page.getByTestId('login-submit-button').click();
}

/**
 * Waits for the magic link sent confirmation message to be visible.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves when the confirmation container is visible.
 */
export async function waitForMagicLinkSent(page: Page): Promise<void> {
  await page.getByTestId('magic-link-sent-container').waitFor({ state: 'visible' });
}

/**
 * Logs out the current user via the user menu.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves when the user is logged out and redirected to login.
 */
export async function logout(page: Page): Promise<void> {
  await page.getByTestId('user-menu-trigger').click();
  await page.getByTestId('logout-button').click();
  
  // Wait for redirect to login page
  await page.waitForURL('**/login');
}

/**
 * Verifies if the user is currently logged in by checking for the user menu trigger.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves to true if logged in, false otherwise.
 */
export async function verifyLoggedIn(page: Page): Promise<boolean> {
  try {
    await page.getByTestId('user-menu-trigger').waitFor({ state: 'visible', timeout: E2E_CONFIG.TIMEOUT.ASSERTION });
    return true;
  } catch {
    return false;
  }
}
