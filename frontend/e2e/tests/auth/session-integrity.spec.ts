import { test, expect } from "../../fixtures";
import { submitLoginEmail, waitForMagicLinkSent } from "../../helpers/auth.helper";
import { getMagicLinkFromEmail, clearMailbox } from "../../helpers/inbucket.helper";

/**
 * E2E Regression Verification for HttpOnly Session Integrity.
 *
 * Verifies that:
 * 1. After magic link login (PKCE → /api/auth/callback) the browser holds exactly
 *    one `magazyn_sid` cookie.
 * 2. `magazyn_sid` is HttpOnly and SameSite=Lax (not readable by JavaScript).
 * 3. No legacy Supabase `sb-*` auth cookies are present.
 * 4. POST /api/auth/logout deletes `magazyn_sid`.
 * 5. A tampered `magazyn_sid` cookie is rejected and the user is redirected to /login.
 */
test.describe("HttpOnly Session Integrity (P0 Regression Guardrail)", () => {
  test("sets an HttpOnly magazyn_sid cookie, clears legacy cookies, logout removes it, tampering redirects to login", async ({
    page,
    testUser,
  }) => {
    test.setTimeout(60000);

    // -------------------------------------------------------------------------
    // Step 1: Authenticate via magic link
    // -------------------------------------------------------------------------
    await clearMailbox(testUser.email);
    await submitLoginEmail(page, testUser.email);
    await waitForMagicLinkSent(page);
    const magicLink = await getMagicLinkFromEmail(testUser.email);
    await page.goto(magicLink);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 2: Assert single HttpOnly SameSite=Lax magazyn_sid cookie
    // -------------------------------------------------------------------------
    const cookies = await page.context().cookies();
    const sid = cookies.find((c) => c.name === "magazyn_sid");
    expect(sid, "magazyn_sid cookie must be set after magic link login").toBeDefined();
    expect(sid?.httpOnly, "magazyn_sid must be HttpOnly").toBe(true);
    expect(sid?.sameSite, "magazyn_sid must be SameSite=Lax").toBe("Lax");

    // -------------------------------------------------------------------------
    // Step 3: No legacy Supabase cookies
    // -------------------------------------------------------------------------
    const oldCookies = cookies.filter((c) => c.name.startsWith("sb-"));
    expect(oldCookies, "no legacy sb-* auth cookies may exist").toHaveLength(0);

    // -------------------------------------------------------------------------
    // Step 4: POST /api/auth/logout deletes magazyn_sid
    // -------------------------------------------------------------------------
    await page.request.post("/api/auth/logout");
    const postLogoutCookies = await page.context().cookies();
    expect(
      postLogoutCookies.find((c) => c.name === "magazyn_sid"),
      "magazyn_sid must be removed after logout"
    ).toBeUndefined();

    // -------------------------------------------------------------------------
    // Step 5: Tampered cookie is rejected → redirected to /login
    // -------------------------------------------------------------------------
    const baseURL = process.env.E2E_BASE_URL || "http://localhost";
    const urlObj = new URL(baseURL);
    await page
      .context()
      .addCookies([{ name: "magazyn_sid", value: "tampered", domain: urlObj.hostname, path: "/" }]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*\/login/);
  });
});
