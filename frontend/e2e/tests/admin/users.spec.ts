import { test, expect } from "../../fixtures";
import { AdminUsersPage } from "../../page-objects/admin-users.pom";
import { TEST_IDS } from "../../constants";

test.describe("Admin User Management", () => {
  let targetUserEmail: string;
  let targetUserId: string;

  /**
   * Setup: Create a dedicated target user for the admin to manipulate.
   * This isolates the test from the shared testUser and avoids race conditions.
   */
  test.beforeEach(async ({ supabaseAdmin, workerIndex }) => {
    const timestamp = Date.now();
    targetUserEmail = `admin_test_target_${workerIndex}_${timestamp}@example.com`;

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: targetUserEmail,
      password: "TestSecurePassword123!",
      email_confirm: true,
      user_metadata: { name: "Target User" },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create target user: ${error?.message}`);
    }
    targetUserId = data.user.id;

    const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
      id: targetUserId,
      email: targetUserEmail,
      username: `target_user_${timestamp}`,
      role: "user",
      is_enabled: true,
      credit_balance: 100,
    });

    if (profileError) {
      throw new Error(`Failed to upsert target user profile: ${profileError.message}`);
    }
  });

  /**
   * Teardown: Delete the target user.
   */
  test.afterEach(async ({ supabaseAdmin }) => {
    if (targetUserId) {
      await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    }
  });

  test("should list, search, and edit user details", async ({ superAdminPage }) => {
    const adminUsersPage = new AdminUsersPage(superAdminPage);

    await adminUsersPage.goto();
    await expect(adminUsersPage.getUsersTable()).toBeVisible();

    await expect(
      superAdminPage.getByRole("columnheader", { name: "Nazwa użytkownika" })
    ).toBeVisible();
    await expect(superAdminPage.getByRole("columnheader", { name: "Rola" })).toBeVisible();

    await adminUsersPage.searchUser(targetUserEmail);

    const editButton = superAdminPage.getByTestId(TEST_IDS.adminUserRowEdit(targetUserEmail));
    await expect(editButton).toBeVisible();

    await adminUsersPage.openEditModal(targetUserEmail);
    await adminUsersPage.updateUserRole("admin");
    await adminUsersPage.setUserStatus(false);
    await adminUsersPage.saveChanges();

    await expect(superAdminPage.getByTestId(TEST_IDS.ADMIN_SUCCESS_ALERT)).toBeVisible();

    const userRow = superAdminPage.getByRole("row").filter({ hasText: targetUserEmail });
    await expect(userRow).toContainText(/admin/i);
    await expect(userRow).toContainText(/Wyłączony/i);
  });
});
