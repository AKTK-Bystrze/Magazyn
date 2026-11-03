import { test, expect } from "../../fixtures";
import { submitLoginEmail, waitForMagicLinkSent, logout } from "../../helpers/auth.helper";
import { getMagicLinkFromEmail, clearMailbox } from "../../helpers/inbucket.helper";

test.describe("Login Page", () => {
  test("should display login form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByTestId("login-form")).toBeVisible();
    await expect(page.getByTestId("login-email-input")).toBeVisible();
    await expect(page.getByTestId("login-submit-button")).toBeVisible();
  });

  test("should successfully log in via email magic link", async ({ page, testUser }) => {
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

  test("should isolate sessions during sequential user switching in the same browser window", async ({
    page,
    testUser,
    adminUser,
  }) => {
    await clearMailbox(testUser.email);
    await submitLoginEmail(page, testUser.email);
    await waitForMagicLinkSent(page);

    const magicLinkA = await getMagicLinkFromEmail(testUser.email);
    await page.goto(magicLinkA);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      await page.getByTestId("user-menu-trigger").click();
      await expect(page.getByTestId("user-menu-dropdown")).toBeVisible({ timeout: 1000 });
    }).toPass();
    const dropdown = page.getByTestId("user-menu-dropdown");
    await expect(dropdown).toContainText(testUser.email);

    await logout(page);
    await expect(page).toHaveURL(/.*\/login/);
    await expect(page.getByTestId("login-form")).toBeVisible();

    await clearMailbox(adminUser.email);
    await submitLoginEmail(page, adminUser.email);
    await waitForMagicLinkSent(page);

    const magicLinkB = await getMagicLinkFromEmail(adminUser.email);
    await page.goto(magicLinkB);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    await expect(async () => {
      await page.getByTestId("user-menu-trigger").click();
      await expect(page.getByTestId("user-menu-dropdown")).toBeVisible({ timeout: 1000 });
    }).toPass();
    await expect(page.getByTestId("user-menu-dropdown")).toContainText(adminUser.email);
    await expect(page.getByTestId("user-menu-dropdown")).not.toContainText(testUser.email);

    await logout(page);
    await expect(page).toHaveURL(/.*\/login/);
  });
});
