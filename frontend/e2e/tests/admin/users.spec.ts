import { test, expect } from "../../fixtures";
import { AdminUsersPage } from "../../page-objects/admin-users.pom";
import { TEST_IDS } from "../../constants";
import { clearCreditHistory } from "../../helpers/data-setup.helper";

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
      const { data: reservations, error: reservationLookupError } = await supabaseAdmin
        .from("reservations")
        .select("id")
        .eq("user_id", targetUserId);

      if (reservationLookupError) {
        throw new Error(
          `Failed to find target user reservations: ${reservationLookupError.message}`
        );
      }

      const reservationIds = reservations?.map(({ id }) => id) ?? [];
      if (reservationIds.length > 0) {
        const { error: reservationHistoryError } = await supabaseAdmin
          .from("reservation_history")
          .delete()
          .in("reservation_id", reservationIds);
        if (reservationHistoryError) {
          throw new Error(
            `Failed to clear target user reservation history: ${reservationHistoryError.message}`
          );
        }

        const { error: reservationCreditHistoryError } = await supabaseAdmin
          .from("credit_history")
          .delete()
          .in("reservation_id", reservationIds);
        if (reservationCreditHistoryError) {
          throw new Error(
            `Failed to clear target user reservation credits: ${reservationCreditHistoryError.message}`
          );
        }

        const { error: reservationDeleteError } = await supabaseAdmin
          .from("reservations")
          .delete()
          .in("id", reservationIds);
        if (reservationDeleteError) {
          throw new Error(
            `Failed to clear target user reservations: ${reservationDeleteError.message}`
          );
        }
      }

      await clearCreditHistory(supabaseAdmin, targetUserId);

      const { error: authoredCreditHistoryError } = await supabaseAdmin
        .from("credit_history")
        .delete()
        .eq("author_id", targetUserId);
      if (authoredCreditHistoryError) {
        throw new Error(
          `Failed to clear target user-authored credits: ${authoredCreditHistoryError.message}`
        );
      }

      const { error: userHistoryError } = await supabaseAdmin
        .from("reservation_history")
        .delete()
        .eq("user_id", targetUserId);
      if (userHistoryError) {
        throw new Error(
          `Failed to clear target user reservation history: ${userHistoryError.message}`
        );
      }

      const { error: auditHistoryError } = await supabaseAdmin
        .from("reservation_history")
        .delete()
        .eq("changed_by_user_id", targetUserId);
      if (auditHistoryError) {
        throw new Error(`Failed to clear target user audit history: ${auditHistoryError.message}`);
      }

      const { error: maintenanceLogError } = await supabaseAdmin
        .from("maintenance_logs")
        .delete()
        .eq("admin_id", targetUserId);
      if (maintenanceLogError) {
        throw new Error(
          `Failed to clear target user maintenance logs: ${maintenanceLogError.message}`
        );
      }

      const { error } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
      if (error) {
        throw new Error(`Failed to delete target user: ${error.message}`);
      }
      targetUserId = "";
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
    await expect(superAdminPage.getByLabel("Stan Konta (Kredyty)")).not.toBeAttached();
    await adminUsersPage.updateUserRole("admin");
    await adminUsersPage.setUserStatus(false);
    await adminUsersPage.saveChanges();

    await expect(superAdminPage.getByTestId(TEST_IDS.ADMIN_SUCCESS_ALERT)).toBeVisible();

    const userRow = superAdminPage.getByRole("row").filter({ hasText: targetUserEmail });
    await expect(userRow).toContainText(/admin/i);
    await expect(userRow).toContainText(/Wyłączony/i);
  });

  test("adjusts credits for one user through the audited credit adjustment form", async ({
    superAdminPage,
    supabaseAdmin,
  }) => {
    const adminUsersPage = new AdminUsersPage(superAdminPage);

    await adminUsersPage.goto();
    await adminUsersPage.searchUser(targetUserEmail);
    await adminUsersPage.adjustUserCredits(
      targetUserEmail,
      25,
      "Nagroda za pomoc",
      "Porządkowanie magazynu"
    );

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", targetUserId)
      .single();
    expect(profileError).toBeNull();
    expect(profile?.credit_balance).toBe(125);

    const { data: history, error: historyError } = await supabaseAdmin
      .from("credit_history")
      .select("amount, reason, description")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(historyError).toBeNull();
    expect(history).toMatchObject({
      amount: 25,
      reason: "admin_adjustment",
      description: "Nagroda za pomoc - Porządkowanie magazynu",
    });
  });
});
