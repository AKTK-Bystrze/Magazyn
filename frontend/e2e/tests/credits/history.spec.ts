import { test, expect } from '../../fixtures';
import { CreditHistoryPage } from '../../page-objects/credit-history.pom';
// Using relative path to ensure resolution without relying on potentially unconfigured aliases in E2E
import { CREDIT_HISTORY_UI_STRINGS } from '../../../src/lib/config/constants/credit/ui-strings';

const API_ROUTE_CREDITS_HISTORY = '**/api/credits/history*';

const MOCK_HISTORY = {
  credit_history: [
    {
      id: 'h1',
      user_id: 'u1',
      username: 'tester',
      amount: -10,
      reason: 'reservation_charge',
      description: 'Opłata za rezerwację #123',
      reservation_id: 'r1',
      author_id: 'system',
      author_username: 'System',
      created_at: '2023-12-01T10:00:00Z',
    },
    {
      id: 'h2',
      user_id: 'u1',
      username: 'tester',
      amount: 5,
      reason: 'reservation_refund',
      description: 'Zwrot za rezerwację #123 (Anulowana)',
      reservation_id: 'r1',
      author_id: 'admin',
      author_username: 'Admin',
      created_at: '2023-12-02T11:00:00Z',
    },
    {
      id: 'h3',
      user_id: 'u1',
      username: 'tester',
      amount: 15,
      reason: 'work_credit',
      description: 'Za sprzątanie magazynu',
      reservation_id: null,
      author_id: 'admin',
      author_username: 'Admin',
      created_at: '2023-12-03T09:00:00Z',
    }
  ],
  current_balance: 110,
  pagination: {
    page: 1,
    per_page: 10,
    total_items: 3,
    total_pages: 1
  }
};

const MOCK_EMPTY = {
  credit_history: [],
  current_balance: 100,
  pagination: {
    page: 1,
    per_page: 10,
    total_items: 0,
    total_pages: 0
  }
};

/**
 * Credits History e2e tests.
 * Covers layout, responsive columns, tooltips, and empty state.
 */
test.describe('Credits History', () => {
  let creditPage: CreditHistoryPage;

  test.beforeEach(async ({ page }) => {
    creditPage = new CreditHistoryPage(page);
  });

  // Use test.use to force mobile viewport if not already global, 
  // but global config says we use Pixel 5. 

  test('should display comprehensive history view with correct layout', async ({ authenticatedPage }) => {
    await authenticatedPage.route(API_ROUTE_CREDITS_HISTORY, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_HISTORY),
      });
    });

    creditPage = new CreditHistoryPage(authenticatedPage);
    
    await creditPage.goto();

    const historyTable = creditPage.getHistoryTable();
    await expect(historyTable).toBeVisible();
    await expect(authenticatedPage.getByText(CREDIT_HISTORY_UI_STRINGS.PAGE_TITLE)).toBeVisible();
    
    // Rows index 0, 1, 2
    await expect(creditPage.getHistoryRow(0)).toBeVisible();
    await expect(creditPage.getHistoryRow(1)).toBeVisible();
    await expect(creditPage.getHistoryRow(2)).toBeVisible();
    await expect(creditPage.getHistoryRow(3)).toBeHidden();

    // "Autor" should be visible (as per plan/code check)
    await expect(creditPage.getColumnHeader(CREDIT_HISTORY_UI_STRINGS.TABLE_AUTHOR)).toBeVisible();

    // "Description" should be hidden on mobile
    await expect(creditPage.getColumnHeader(CREDIT_HISTORY_UI_STRINGS.TABLE_DESCRIPTION)).toBeHidden();

    // Hover/Click reason badge in first row
    await creditPage.hoverReason(0);
    // Tooltip should contain description "Opis" from row 0
    await expect(authenticatedPage.getByRole('tooltip').getByText(MOCK_HISTORY.credit_history[0].description)).toBeVisible();
  });

  test('should display empty state when no history exists', async ({ authenticatedPage }) => {
     await authenticatedPage.route(API_ROUTE_CREDITS_HISTORY, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_EMPTY),
      });
    });

    creditPage = new CreditHistoryPage(authenticatedPage);

    await creditPage.goto();

    await expect(creditPage.getEmptyState()).toBeVisible();
    await expect(creditPage.getEmptyState()).toContainText(CREDIT_HISTORY_UI_STRINGS.NO_HISTORY);
    await expect(creditPage.getHistoryTable()).toBeHidden();
  });
});
