import { type Page, type Locator } from "@playwright/test";
import { expect } from "../fixtures";
import { TEST_IDS } from "../constants/test-ids";

export type UserRole = "user" | "admin" | "moderator";

export class AdminUsersPage {
  readonly page: Page;
  readonly table: Locator;
  readonly searchInput: Locator;
  readonly editModal: Locator;
  readonly roleSelect: Locator;
  readonly statusActive: Locator;
  readonly statusDisabled: Locator;
  readonly saveButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.getByTestId(TEST_IDS.ADMIN_USERS_TABLE);
    this.searchInput = page.getByTestId(TEST_IDS.ADMIN_SEARCH_INPUT);
    this.editModal = page.getByTestId(TEST_IDS.ADMIN_EDIT_USER_MODAL);
    this.roleSelect = page.getByTestId(TEST_IDS.ADMIN_USER_ROLE_SELECT);
    this.statusActive = page.getByTestId(TEST_IDS.ADMIN_USER_STATUS_ACTIVE);
    this.statusDisabled = page.getByTestId(TEST_IDS.ADMIN_USER_STATUS_DISABLED);
    this.saveButton = page.getByTestId(TEST_IDS.ADMIN_SAVE_USER_BTN);
  }

  /**
   * Navigates to the admin users page.
   */
  async goto() {
    await this.page.goto("/admin/users", { waitUntil: "networkidle" });
  }

  async searchUser(query: string) {
    const responsePromise = this.page.waitForResponse((response) => {
      const url = response.url();
      return url.includes("/api/users") && url.includes("search=") && response.status() === 200;
    });
    await this.searchInput.fill(query);
    await responsePromise;
  }

  /**
   * Opens the edit modal for a specific user.
   * @param email - The email of the user to edit.
   */
  async openEditModal(email: string) {
    await this.page.getByTestId(TEST_IDS.adminUserRowEdit(email)).click({ force: true });
    await expect(this.editModal).toBeVisible();
  }

  /**
   * Updates the user's role in the edit modal.
   * @param role - The new role to select.
   */
  async updateUserRole(role: UserRole) {
    await this.roleSelect.click();
    const roleTextMap: Record<string, string> = {
      user: "User",
      admin: "Admin",
      super_admin: "Super Admin",
    };
    const optionText = roleTextMap[role] || role;
    await this.page.getByRole("option", { name: optionText, exact: true }).click();
  }

  /**
   * Sets the user's active status.
   * @param isActive - True for active, false for disabled.
   */
  async setUserStatus(isActive: boolean) {
    if (isActive) {
      await this.statusActive.click({ force: true });
      await expect(this.statusActive).toHaveAttribute("data-state", "checked");
    } else {
      await this.statusDisabled.click({ force: true });
      await expect(this.statusDisabled).toHaveAttribute("data-state", "checked");
    }
  }

  /**
   * Saves the changes in the edit modal.
   */
  async saveChanges() {
    await this.saveButton.click({ force: true });
    // Check if error message appears before assuming success
    // Wait for modal to disappear
    await expect(this.editModal).not.toBeVisible();
  }

  /**
   * Returns the users table locator.
   */
  getUsersTable() {
    return this.table;
  }
}
