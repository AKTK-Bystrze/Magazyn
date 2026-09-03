import { test, expect } from "../../fixtures";
import { submitLoginEmail, waitForMagicLinkSent } from "../../helpers/auth.helper";
import { getMagicLinkFromEmail, clearMailbox } from "../../helpers/inbucket.helper";

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

test.describe("Login Page", () => {
  /**
   * Scenario: Login Page Display
   * Verifies that the login page loads and displays the email login form.
   */
  test("should display login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("login-email-input")).toBeVisible();
    await expect(page.getByTestId("login-submit-button")).toBeVisible();
  });

  /**
   * Scenario: Login Flow via Email Magic Link
   * Verifies the full user flow of requesting a magic link and successfully authenticating.
   */
  test("should successfully log in via email magic link", async ({ page, testUser }) => {
    // Note: Requesting `testUser` fixture is necessary to ensure the user exists in DB before we request
    // a magic link. Previously, missing this fixture caused backend errors, which manifested as
    // e2e resource exhaustion and timeouts rather than clear test failures.
    const testEmail = testUser.email;

    // Clear the mailbox before testing to ensure we get the fresh magic link
    await clearMailbox(testEmail);

    // Act: Submit login
    await submitLoginEmail(page, testEmail);
    await waitForMagicLinkSent(page);

    // Act: Retrieve magic link from Mailpit
    const magicLink = await getMagicLinkFromEmail(testEmail);

    // Act: Navigate to magic link
    await page.goto(magicLink);

    // Assert: Verify successful login by checking for user menu trigger
    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });
  });
});
