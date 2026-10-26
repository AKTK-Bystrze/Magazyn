import { test, expect } from "../../fixtures";
import { submitLoginEmail, waitForMagicLinkSent, logout } from "../../helpers/auth.helper";
import { getMagicLinkFromEmail, clearMailbox } from "../../helpers/inbucket.helper";
import { AdminUsersPage } from "../../page-objects/admin-users.pom";

declare global {
  interface Window {
    supabase?: {
      auth: {
        refreshSession: () => Promise<{
          data: { user: { id: string; email?: string } | null } | null;
          error: { message: string } | null;
        }>;
      };
    };
  }
}

/**
 * E2E Regression Verification for P0 Session & Cookie Integrity (Requirement R5).
 *
 * Verifies that:
 * 1. A regular user authenticates via magic link with a standard (unchunked) token.
 * 2. SuperAdmin authenticates in the same browser session with padded metadata (>3180B session).
 * 3. No unchunked base cookie coexists with chunked cookies (.0 and .1).
 * 4. Administrative credit adjustment on the target user executes via UI and backend mutation.
 * 5. window.supabase.auth.refreshSession() completes successfully without session hijacking.
 * 6. SuperAdmin identity, topbar credentials, and permissions remain intact.
 */
test.describe("Session & Cookie Integrity (P0 Regression Guardrail)", () => {
  test("retains SuperAdmin identity across administrative mutations and token refresh without cookie coexistence", async ({
    page,
    testUser,
    superAdminUser,
    supabaseAdmin,
  }) => {
    test.setTimeout(60000);

    // -------------------------------------------------------------------------
    // Setup: Ensure SuperAdmin session payload exceeds 3180 bytes to trigger chunking
    // -------------------------------------------------------------------------
    await supabaseAdmin.auth.admin.updateUserById(superAdminUser.id, {
      user_metadata: {
        role: "super_admin",
        name: "E2E Super Admin User",
        chunk_padding: "x".repeat(2500),
      },
    });

    // Capture initial credit balance of testUser
    const { data: initialProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    expect(profileErr).toBeNull();
    const initialCredits = initialProfile?.credit_balance ?? 100;

    // -------------------------------------------------------------------------
    // Step 1: Authenticate regular user (small token) via UI magic link
    // -------------------------------------------------------------------------
    await clearMailbox(testUser.email);
    await submitLoginEmail(page, testUser.email);
    await waitForMagicLinkSent(page);
    const magicLinkUser = await getMagicLinkFromEmail(testUser.email);
    await page.goto(magicLinkUser);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    // Assert initial unchunked cookie exists
    const initialCookies = await page.context().cookies();
    const unchunkedInitial = initialCookies.find(
      (c) => c.name === "sb-magazyn-auth-token" && c.value && c.value !== "deleted"
    );
    expect(
      unchunkedInitial,
      "Initial regular user should have unchunked auth cookie"
    ).toBeDefined();

    // -------------------------------------------------------------------------
    // Step 2: Authenticate SuperAdmin in the same browser session
    // -------------------------------------------------------------------------
    await logout(page);
    await expect(page).toHaveURL(/.*\/login/);

    await clearMailbox(superAdminUser.email);
    await submitLoginEmail(page, superAdminUser.email);
    await waitForMagicLinkSent(page);
    const magicLinkAdmin = await getMagicLinkFromEmail(superAdminUser.email);
    await page.goto(magicLinkAdmin);

    await expect(page.getByTestId("user-menu-trigger")).toBeVisible({ timeout: 10000 });

    // -------------------------------------------------------------------------
    // Step 3: Assert no unchunked sb-magazyn-auth-token coexists with chunked cookies
    // -------------------------------------------------------------------------
    const adminCookies = await page.context().cookies();
    const chunk0 = adminCookies.find((c) => c.name === "sb-magazyn-auth-token.0");
    const chunk1 = adminCookies.find((c) => c.name === "sb-magazyn-auth-token.1");
    const unchunkedActive = adminCookies.find(
      (c) => c.name === "sb-magazyn-auth-token" && c.value && c.value !== "deleted"
    );

    expect(chunk0, "Expected sb-magazyn-auth-token.0 to exist").toBeDefined();
    expect(chunk1, "Expected sb-magazyn-auth-token.1 to exist").toBeDefined();
    expect(
      unchunkedActive,
      "Unchunked base cookie MUST NOT coexist with chunked cookies"
    ).toBeUndefined();

    // -------------------------------------------------------------------------
    // Step 4: Perform administrative mutation (POST /api/users/bulk-adjust-credits) on target user
    // -------------------------------------------------------------------------
    const adminUsersPage = new AdminUsersPage(page);
    await adminUsersPage.goto();
    await adminUsersPage.searchUser(testUser.email);

    const [mutationResponse] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/users/bulk-adjust-credits") &&
          res.request().method() === "POST" &&
          res.status() === 200,
        { timeout: 10000 }
      ),
      adminUsersPage.adjustUserCredits(
        testUser.email,
        50,
        "Nagroda za test",
        "Deterministic Session Integrity Verification"
      ),
    ]);
    expect(mutationResponse.ok()).toBe(true);

    // -------------------------------------------------------------------------
    // Step 5: Trigger window.supabase.auth.refreshSession() and wait for token refresh cycle
    // -------------------------------------------------------------------------
    await page.waitForFunction(() => typeof window.supabase?.auth?.refreshSession === "function", {
      timeout: 5000,
    });

    const [refreshResponse, refreshResult] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes("/auth/v1/token") && res.request().method() === "POST",
        { timeout: 10000 }
      ),
      page.evaluate(async () => {
        if (!window.supabase) {
          throw new Error("window.supabase is not defined");
        }
        const res = await window.supabase.auth.refreshSession();
        return {
          error: res.error ? res.error.message : null,
          userId: res.data?.user?.id ?? null,
          email: res.data?.user?.email ?? null,
        };
      }),
    ]);

    expect(refreshResponse.status()).toBe(200);
    expect(refreshResult.error).toBeNull();
    expect(refreshResult.email).toBe(superAdminUser.email);
    expect(refreshResult.userId).toBe(superAdminUser.id);

    // -------------------------------------------------------------------------
    // Step 6: Assert SuperAdmin identity, topbar credentials, and administrative permissions remain intact
    // -------------------------------------------------------------------------
    await page.goto("/admin/users", { waitUntil: "networkidle" });
    await expect(adminUsersPage.getUsersTable()).toBeVisible();

    await expect(async () => {
      await page.getByTestId("user-menu-trigger").click();
      await expect(page.getByTestId("user-menu-dropdown")).toBeVisible({ timeout: 1000 });
    }).toPass();

    const dropdown = page.getByTestId("user-menu-dropdown");
    await expect(dropdown).toContainText(superAdminUser.email);
    await expect(dropdown).not.toContainText(testUser.email);

    // Assert target user credits actually incremented by 50 in DB
    const { data: updatedTargetProfile, error: updatedProfileErr } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    expect(updatedProfileErr).toBeNull();
    expect(updatedTargetProfile?.credit_balance).toBe(initialCredits + 50);

    // Assert cookies still maintain bilateral pruning (no unchunked cookie resurrected)
    const postRefreshCookies = await page.context().cookies();
    const postRefreshUnchunked = postRefreshCookies.find(
      (c) => c.name === "sb-magazyn-auth-token" && c.value && c.value !== "deleted"
    );
    expect(
      postRefreshUnchunked,
      "Post-refresh cookies MUST NOT resurrect unchunked base cookie"
    ).toBeUndefined();
  });
});
