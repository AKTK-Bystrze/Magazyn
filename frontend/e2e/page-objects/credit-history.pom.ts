import { type Page, type Locator } from '@playwright/test';
import { expect } from '../fixtures';
import { TEST_IDS } from '../constants/test-ids';
import { E2E_CONFIG } from '../constants/config';

/**
 * Page Object Model for Credit History page.
 * Encapsulates interactions with the credit history interface.
 */
export class CreditHistoryPage {
  readonly page: Page;
  readonly table: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;
    this.table = page.getByTestId(TEST_IDS.CREDIT_HISTORY_TABLE);
    this.emptyState = page.getByTestId(TEST_IDS.CREDIT_HISTORY_EMPTY_STATE);
  }

  /**
   * Navigates to the credit history page.
   */
  async goto() {
    await this.page.goto('/credits/history', { waitUntil: 'networkidle' });
    await this.page.waitForLoadState('domcontentloaded');
  }

  /**
   * Gets the credit history table locator.
   *
   * @returns Locator for the table.
   */
  getHistoryTable(): Locator {
    return this.table;
  }

  /**
   * Gets the table row locator for a specific index.
   *
   * @param index - The row index.
   * @returns Locator for the row.
   */
  getHistoryRow(index: number): Locator {
    return this.page.getByTestId(TEST_IDS.creditHistoryRow(index));
  }

  /**
   * Gets the column header locator by name.
   *
   * @param name - The text of the column header.
   * @returns Locator for the header.
   */
  getColumnHeader(name: string): Locator {
    return this.table.locator('th').filter({ hasText: name });
  }

  /**
   * Hovers over the reason badge in the specified row.
   *
   * @param rowIndex - The row index.
   */
  async hoverReason(rowIndex: number) {
    const row = this.getHistoryRow(rowIndex);
    const reasonCell = row.locator('td').nth(1);

    await reasonCell.locator('[data-slot="badge"]').click();
  }

  /**
   * Gets the empty state locator.
   *
   * @returns Locator for the empty state component.
   */
  getEmptyState(): Locator {
    return this.emptyState;
  }
}
