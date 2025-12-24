import { type Page, type Locator } from '@playwright/test';
import { expect } from '../fixtures';
import { TEST_IDS } from '../constants/test-ids';
import { E2E_CONFIG } from '../constants/config';

/**
 * Equipment form data for create/edit operations.
 */
export interface EquipmentFormData {
  internalId: string;
  typeId: string;
  name?: string;
  description?: string;
  status?: string;
}

/**
 * Page Object Model for Admin Equipment Manager page.
 * Encapsulates interactions with the equipment management interface.
 */
export class EquipmentManagerPage {
  readonly page: Page;
  readonly addButton: Locator;
  readonly table: Locator;
  readonly successAlert: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addButton = page.getByTestId(TEST_IDS.ADMIN_ADD_EQUIPMENT_BTN);
    this.table = page.getByTestId(TEST_IDS.ADMIN_EQUIPMENT_TABLE);
    this.successAlert = page.getByTestId(TEST_IDS.ADMIN_SUCCESS_ALERT);
    this.errorAlert = page.getByTestId(TEST_IDS.ADMIN_ERROR_ALERT);
  }

  /**
   * Gets the add equipment dialog locator.
   * Dialog locators must be retrieved dynamically since they render in portals.
   *
   * @returns Locator for the add equipment dialog.
   */
  getAddDialog(): Locator {
    return this.page.getByTestId(TEST_IDS.ADMIN_ADD_EQUIPMENT_DIALOG);
  }

  /**
   * Gets the archive equipment dialog locator.
   * Dialog locators must be retrieved dynamically since they render in portals.
   *
   * @returns Locator for the archive equipment dialog.
   */
  getArchiveDialog(): Locator {
    return this.page.getByTestId(TEST_IDS.ADMIN_ARCHIVE_EQUIPMENT_DIALOG);
  }

  /**
   * Navigates to the equipment manager page.
   */
  async goto() {
    await this.page.goto('/admin/equipment/manage', { waitUntil: 'networkidle' });
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(E2E_CONFIG.TIMEOUT.ACTION);
  }

  /**
   * Clicks the "Add Equipment" button to open the creation dialog.
   */
  async clickAddEquipment() {
    await this.addButton.waitFor({ state: 'visible' });
    await expect(this.addButton).toBeEnabled({ timeout: E2E_CONFIG.TIMEOUT.ASSERTION });
    await this.addButton.click();
    await expect(this.getAddDialog()).toBeVisible({ timeout: E2E_CONFIG.TIMEOUT.ASSERTION });
  }

  /**
   * Fills the equipment form with provided data.
   *
   * @param data - The equipment data to fill into the form.
   */
  async fillEquipmentForm(data: EquipmentFormData) {
    if (data.internalId) {
      await this.page.getByTestId(TEST_IDS.EQUIPMENT_FORM_INTERNAL_ID_INPUT).fill(data.internalId);
    }

    if (data.typeId) {
      await this.page.getByTestId(TEST_IDS.EQUIPMENT_FORM_TYPE_SELECT).click();
      await this.page.getByRole('option').filter({ hasText: new RegExp(data.typeId, 'i') }).first().click();
    }

    if (data.name) {
      await this.page.getByTestId(TEST_IDS.EQUIPMENT_FORM_NAME_INPUT).fill(data.name);
    }

    if (data.description) {
      await this.page.getByTestId(TEST_IDS.EQUIPMENT_FORM_DESCRIPTION_INPUT).fill(data.description);
    }

    if (data.status) {
      await this.page.getByTestId(TEST_IDS.EQUIPMENT_FORM_STATUS_SELECT).click();
      await this.page.getByRole('option', { name: new RegExp(data.status, 'i') }).first().click();
    }
  }

  /**
   * Submits the equipment form.
   */
  async submitForm() {
    await this.page.getByTestId(TEST_IDS.EQUIPMENT_FORM_SUBMIT_BTN).click();
  }

  /**
   * Cancels the equipment form.
   */
  async cancelForm() {
    await this.page.getByTestId(TEST_IDS.EQUIPMENT_FORM_CANCEL_BTN).click();
  }

  /**
   * Gets the table row locator for a specific equipment item.
   *
   * @param id - The equipment ID.
   * @returns Locator for the equipment row.
   */
  getEquipmentRow(id: string): Locator {
    return this.page.getByTestId(TEST_IDS.equipmentRow(id));
  }

  /**
   * Opens the actions menu for a specific equipment item.
   * Encapsulates the logic for scrolling, clicking, and waiting for the menu to open.
   *
   * @param id - The equipment ID.
   */
  private async openActionsMenu(id: string) {
    const actionsMenu = this.page.getByTestId(TEST_IDS.equipmentActionsMenu(id));
    await actionsMenu.scrollIntoViewIfNeeded();
    await expect(actionsMenu).toBeVisible();
    await actionsMenu.click({ force: true });

    // Wait for the menu to open (Radix UI portal) and animation to finish
    await expect(this.page.getByRole('menu')).toBeVisible();
    await this.page.waitForTimeout(E2E_CONFIG.TIMEOUT.ACTION);
  }

  /**
   * Opens the actions menu and clicks edit for a specific equipment item.
   *
   * @param id - The equipment ID.
   */
  async clickEdit(id: string) {
    await this.openActionsMenu(id);

    const editBtn = this.page.getByTestId(TEST_IDS.equipmentEditBtn(id));
    await expect(editBtn).toBeVisible();
    await editBtn.click({ force: true });
  }

  /**
   * Opens the actions menu and clicks archive for a specific equipment item.
   *
   * @param id - The equipment ID.
   */
  async clickArchive(id: string) {
    await this.openActionsMenu(id);

    const archiveBtn = this.page.getByTestId(TEST_IDS.equipmentArchiveBtn(id));
    await expect(archiveBtn).toBeVisible();
    await archiveBtn.click({ force: true });
    await expect(this.getArchiveDialog()).toBeVisible();
  }

  /**
   * Confirms the archive action in the confirmation dialog.
   */
  async confirmArchive() {
    await this.page.getByTestId(TEST_IDS.EQUIPMENT_ARCHIVE_CONFIRM_BTN).click();
  }

  /**
   * Cancels the archive action in the confirmation dialog.
   */
  async cancelArchive() {
    await this.page.getByTestId(TEST_IDS.EQUIPMENT_ARCHIVE_CANCEL_BTN).click();
  }

  /**
   * Verifies that the edit and archive options are present in the actions menu.
   * Opens the menu, checks visibility, and closes it.
   *
   * @param id - The equipment ID.
   */
  async verifyActionsPresent(id: string) {
    await this.openActionsMenu(id);

    // Verify options are visible
    await expect(this.page.getByTestId(TEST_IDS.equipmentEditBtn(id))).toBeVisible();
    await expect(this.page.getByTestId(TEST_IDS.equipmentArchiveBtn(id))).toBeVisible();

    // Close menu
    await this.page.keyboard.press('Escape');
  }

  /**
   * Gets the success alert locator.
   *
   * @returns Locator for the success alert.
   */
  getSuccessAlert(): Locator {
    return this.successAlert;
  }

  /**
   * Gets the error alert locator.
   *
   * @returns Locator for the error alert.
   */
  getErrorAlert(): Locator {
    return this.errorAlert;
  }

  /**
   * Gets the table locator.
   *
   * @returns Locator for the equipment table.
   */
  getTable(): Locator {
    return this.table;
  }
}
