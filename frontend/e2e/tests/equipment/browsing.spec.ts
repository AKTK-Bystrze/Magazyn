import { test, expect } from '../../fixtures';
import { TEST_IDS } from '../../constants';

/**
 * Equipment browsing e2e tests.
 * Tests the equipment listing, filtering, and cart functionality.
 *
 * All tests require authentication and use the `authenticatedPage` fixture.
 *
 * @see fixtures/index.ts for authentication implementation
 */

test.describe('Equipment Browsing', () => {
  /**
   * Scenario: Equipment Details
   * Verifies that clicking an equipment card opens the details sheet.
   * Checks visibility of grid, card, and details sheet.
   */
  test('should open equipment details on click', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();

    const firstCard = authenticatedPage.locator('[data-testid^="equipment-card-"]').first();
    await expect(firstCard).toBeVisible();

    const cardTestId = await firstCard.getAttribute('data-testid');
    const equipmentId = cardTestId?.replace('equipment-card-', '');

    if (equipmentId) {
      const detailsButton = authenticatedPage.getByTestId(TEST_IDS.equipmentDetailsButton(equipmentId));
      await detailsButton.click();

      const detailsSheet = authenticatedPage.getByTestId('equipment-details-sheet');
      await expect(detailsSheet).toBeVisible();
    }
  });
});
