import { test, expect } from "../../fixtures";
import { CreditHistoryPage } from "../../page-objects/credit-history.pom";
import { CREDIT_HISTORY_UI_STRINGS } from "../../../src/lib/config/constants/credit/ui-strings";
import { seedCreditHistory, clearCreditHistory } from "../../helpers/data-setup.helper";

const SEEDED_CREDIT_ENTRIES = [
  {
    amount: -10,
    reason: "reservation_charge" as const,
    description: "Opłata za rezerwację sprzętu",
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    amount: 5,
    reason: "reservation_refund" as const,
    description: "Zwrot za rezerwację",
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    amount: 15,
    reason: "work_credit" as const,
    description: "Za sprzątanie magazynu",
    created_at: new Date().toISOString(),
  },
];

/**
 * Credits History e2e tests.
 * Covers layout, responsive columns, tooltips, and empty state against live backend.
 */
test.describe("Credits History", () => {
  let creditPage: CreditHistoryPage;

  test.afterEach(async ({ supabaseAdmin, testUser }) => {
    await clearCreditHistory(supabaseAdmin, testUser.id);
  });

  test("should display comprehensive history view with correct layout", async ({
    authenticatedPage,
    supabaseAdmin,
    testUser,
  }) => {
    await clearCreditHistory(supabaseAdmin, testUser.id);
    await seedCreditHistory(supabaseAdmin, testUser.id, SEEDED_CREDIT_ENTRIES);

    creditPage = new CreditHistoryPage(authenticatedPage);
    await creditPage.goto();

    const historyTable = creditPage.getHistoryTable();
    await expect(historyTable).toBeVisible();
    await expect(authenticatedPage.getByText(CREDIT_HISTORY_UI_STRINGS.PAGE_TITLE)).toBeVisible();

    await expect(creditPage.getHistoryRow(0)).toBeVisible();
    await expect(creditPage.getHistoryRow(1)).toBeVisible();
    await expect(creditPage.getHistoryRow(2)).toBeVisible();
    await expect(creditPage.getHistoryRow(3)).toBeHidden();

    await expect(creditPage.getColumnHeader(CREDIT_HISTORY_UI_STRINGS.TABLE_AUTHOR)).toBeVisible();

    await expect(
      creditPage.getColumnHeader(CREDIT_HISTORY_UI_STRINGS.TABLE_DESCRIPTION)
    ).toBeHidden();

    // Row 0 is the newest transaction due to created_at descending sort order
    await creditPage.hoverReason(0);
    await expect(
      authenticatedPage.getByRole("tooltip").getByText(SEEDED_CREDIT_ENTRIES[2].description)
    ).toBeVisible();
  });

  test("should display empty state when no history exists", async ({
    authenticatedPage,
    supabaseAdmin,
    testUser,
  }) => {
    await clearCreditHistory(supabaseAdmin, testUser.id);

    creditPage = new CreditHistoryPage(authenticatedPage);
    await creditPage.goto();

    await expect(creditPage.getEmptyState()).toBeVisible();
    await expect(creditPage.getEmptyState()).toContainText(CREDIT_HISTORY_UI_STRINGS.NO_HISTORY);
    await expect(creditPage.getHistoryTable()).toBeHidden();
  });
});
