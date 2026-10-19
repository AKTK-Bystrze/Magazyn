import { test, expect } from "../../fixtures";
import { submitLoginEmail, waitForMagicLinkSent, logout } from "../../helpers/auth.helper";
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

    await clearMailbox(testEmail);

    await submitLoginEmail(page, testEmail);
    await waitForMagicLinkSent(page);

    await expect(page.getByText(/Sprawdź swoją pocztę/i)).toBeVisible();

    const magicLink = await getMagicLinkFromEmail(testEmail);

    await page.goto(magicLink);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    await logout(page);

    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByTestId("login-form")).toBeVisible();
  });

  /**
   * Scenario: Same-Session Multi-User Switching (Issue #23)
   * Verifies that logging out as User A and logging in as User B in the SAME browser window
   * properly isolates sessions without leaking User A's session or profile state,
   * performed strictly via UI without artificial clearCookies() or localStorage.clear().
   */
  test("should isolate sessions during sequential user switching in the same browser window (Issue #23)", async ({
    page,
    testUser,
    adminUser,
  }) => {
    // 1. Log in User A via Magic Link
    await clearMailbox(testUser.email);
    await submitLoginEmail(page, testUser.email);
    await waitForMagicLinkSent(page);

    const magicLinkA = await getMagicLinkFromEmail(testUser.email);
    await page.goto(magicLinkA);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    // Assert User A session is active
    await page.getByTestId("user-menu-trigger").click();
    const dropdown = page.getByTestId("user-menu-dropdown");
    await expect(dropdown).toBeVisible();
    await expect(dropdown).toContainText(testUser.email);

    // 2. Pure UI Logout - strictly DO NOT call clearCookies() or localStorage.clear()
    await logout(page);
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByTestId("login-form")).toBeVisible();

    // 3. Log in User B in the SAME browser window
    await clearMailbox(adminUser.email);
    await submitLoginEmail(page, adminUser.email);
    await waitForMagicLinkSent(page);

    const magicLinkB = await getMagicLinkFromEmail(adminUser.email);
    await page.goto(magicLinkB);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    // 4. Assert User B session is active and NO state of User A remains
    await page.getByTestId("user-menu-trigger").click();
    await expect(page.getByTestId("user-menu-dropdown")).toBeVisible();
    await expect(page.getByTestId("user-menu-dropdown")).toContainText(adminUser.email);
    await expect(page.getByTestId("user-menu-dropdown")).not.toContainText(testUser.email);

    // Clean up: logout User B via UI
    await logout(page);
    await expect(page).toHaveURL(/.*\/login/);
  });
});
