import type { Page } from "@playwright/test";

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
  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByTestId("login-email-input").fill(email);
  await page.getByTestId("login-submit-button").click();
}

/**
 * Waits for the magic link sent confirmation message to be visible.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves when the confirmation container is visible.
 */
export async function waitForMagicLinkSent(page: Page): Promise<void> {
  await page.getByTestId("magic-link-sent-container").waitFor({ state: "visible" });
}
