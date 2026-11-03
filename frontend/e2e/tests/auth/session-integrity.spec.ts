import { test, expect } from "../../fixtures";
import { submitLoginEmail, waitForMagicLinkSent } from "../../helpers/auth.helper";
import { getMagicLinkFromEmail, clearMailbox } from "../../helpers/inbucket.helper";

test.describe("HttpOnly Session Integrity", () => {
  test("sets HttpOnly session cookie, clears cookies on logout, and rejects tampered cookies", async ({
    page,
    testUser,
  }) => {
    test.setTimeout(60000);

    await clearMailbox(testUser.email);
    await submitLoginEmail(page, testUser.email);
    await waitForMagicLinkSent(page);
    const magicLink = await getMagicLinkFromEmail(testUser.email);
    await page.goto(magicLink);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    const cookies = await page.context().cookies();
    const sid = cookies.find((c) => c.name === "magazyn_sid");
    expect(sid, "magazyn_sid cookie must be set after magic link login").toBeDefined();
    expect(sid?.httpOnly, "magazyn_sid must be HttpOnly").toBe(true);
    expect(sid?.sameSite, "magazyn_sid must be SameSite=Lax").toBe("Lax");

    const extraneousCookies = cookies.filter((c) => c.name !== "magazyn_sid");
    expect(extraneousCookies, "only the magazyn_sid session cookie must be present").toHaveLength(
      0
    );

    await page.request.post("/api/auth/logout");
    const postLogoutCookies = await page.context().cookies();
    expect(
      postLogoutCookies.find((c) => c.name === "magazyn_sid"),
      "magazyn_sid must be removed after logout"
    ).toBeUndefined();
    expect(postLogoutCookies, "all cookies must be cleared on logout").toHaveLength(0);

    const baseURL = process.env.E2E_BASE_URL || "http://localhost";
    const urlObj = new URL(baseURL);
    await page
      .context()
      .addCookies([{ name: "magazyn_sid", value: "tampered", domain: urlObj.hostname, path: "/" }]);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*\/login/);
  });
});
