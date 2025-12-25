import { test, expect } from '../../fixtures';
import { AdminUsersPage } from '../../page-objects/admin-users.pom';
import { TEST_IDS } from '../../constants';

test.describe('Admin User Management', () => {
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
      password: 'TestSecurePassword123!',
      email_confirm: true,
      user_metadata: { name: 'Target User' }
    });
    
    if (error || !data.user) {
      throw new Error(`Failed to create target user: ${error?.message}`);
    }
    targetUserId = data.user.id;

    // Ensure profile exists matching the auth user
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: targetUserId,
      email: targetUserEmail,
      username: `target_user_${timestamp}`,
      role: 'user',
      is_enabled: true,
      credit_balance: 100
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

  test('should list, search, and edit user details', async ({ superAdminPage }) => {
    const adminUsersPage = new AdminUsersPage(superAdminPage);
    
    // 1. Navigate to admin users page
    await adminUsersPage.goto();
    await expect(adminUsersPage.getUsersTable()).toBeVisible();

    // 2. Verify table columns (mobile viewport shows: Nazwa użytkownika, Rola)
    await expect(superAdminPage.getByRole('columnheader', { name: 'Nazwa użytkownika' })).toBeVisible();
    await expect(superAdminPage.getByRole('columnheader', { name: 'Rola' })).toBeVisible();

    // 3. Search Interaction
    await adminUsersPage.searchUser(targetUserEmail);
    
    // Verify the user row is visible
    // The edit button ID contains the email, confirming the row is for our user
    const editButton = superAdminPage.getByTestId(TEST_IDS.adminUserRowEdit(targetUserEmail));
    await expect(editButton).toBeVisible();

    // 4. Edit Flow
    await adminUsersPage.openEditModal(targetUserEmail);
    
    // Change Role: User -> Admin
    await adminUsersPage.updateUserRole('admin');
    
    // Toggle Status: Active -> Inactive (assuming it starts active)
    await adminUsersPage.setUserStatus(false);

    await adminUsersPage.saveChanges();

    // 5. Verification
    // Assert success via alert
    await expect(superAdminPage.getByTestId(TEST_IDS.ADMIN_SUCCESS_ALERT)).toBeVisible();

    // Verify updates in the user row
    const userRow = superAdminPage.getByRole('row').filter({ hasText: targetUserEmail });
    await expect(userRow).toContainText(/admin/i); 
    await expect(userRow).toContainText(/Wyłączony/i); 
  });
});
