import { test, expect } from './fixtures';

/**
 * Equipment browsing e2e tests.
 * Tests the equipment listing, filtering, and cart functionality.
 *
 * All tests require authentication and use the `authenticatedPage` fixture.
 *
 * @see fixtures/index.ts for authentication implementation
 */

test.describe('Equipment Browsing', () => {
  test('should display equipment grid with items', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    // Wait for the equipment search container to load
    await expect(authenticatedPage.getByTestId('equipment-search-container')).toBeVisible();

    // Check if equipment grid is visible (not empty state)
    const equipmentGrid = authenticatedPage.getByTestId('equipment-grid');
    await expect(equipmentGrid).toBeVisible();
  });

  test('should display equipment cards with details', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    // Wait for grid to load
    await expect(authenticatedPage.getByTestId('equipment-grid')).toBeVisible();

    // Find the first equipment card
    const firstCard = authenticatedPage.locator('[data-testid^="equipment-card-"]').first();
    await expect(firstCard).toBeVisible();

    // Get the card's ID to check other elements
    const cardTestId = await firstCard.getAttribute('data-testid');
    const equipmentId = cardTestId?.replace('equipment-card-', '');

    if (equipmentId) {
      // Check that the card has a status badge
      const statusBadge = authenticatedPage.getByTestId(`equipment-status-badge-${equipmentId}`);
      await expect(statusBadge).toBeVisible();

      // Check for details button
      const detailsButton = authenticatedPage.getByTestId(`equipment-details-button-${equipmentId}`);
      await expect(detailsButton).toBeVisible();
    }
  });

  test('should show equipment count or empty state', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    await expect(authenticatedPage.getByTestId('equipment-search-container')).toBeVisible();

    // Check if we have equipment or empty state
    const hasEquipment = await authenticatedPage
      .getByTestId('equipment-grid')
      .isVisible()
      .catch(() => false);
    const isEmpty = await authenticatedPage
      .getByTestId('equipment-grid-empty')
      .isVisible()
      .catch(() => false);

    // One of these should be true
    expect(hasEquipment || isEmpty).toBeTruthy();

    if (hasEquipment) {
      const cardCount = await authenticatedPage.locator('[data-testid^="equipment-card-"]').count();
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('should display cart indicator', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    // Cart indicator should be visible (even if count is 0)
    const cartIndicator = authenticatedPage.getByTestId('cart-indicator');
    await expect(cartIndicator).toBeVisible();
  });

  test('should open equipment details on click', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    // Wait for equipment to load
    await expect(authenticatedPage.getByTestId('equipment-grid')).toBeVisible();

    // Find first equipment card
    const firstCard = authenticatedPage.locator('[data-testid^="equipment-card-"]').first();
    await expect(firstCard).toBeVisible();

    // Get the equipment ID
    const cardTestId = await firstCard.getAttribute('data-testid');
    const equipmentId = cardTestId?.replace('equipment-card-', '');

    if (equipmentId) {
      const detailsButton = authenticatedPage.getByTestId(`equipment-details-button-${equipmentId}`);
      await detailsButton.click();

      // Wait for the details sheet to open using explicit wait
      const detailsSheet = authenticatedPage.getByTestId('equipment-details-sheet');
      await expect(detailsSheet).toBeVisible();
    }
  });

  test('should allow adding equipment to cart', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    // Wait for equipment to load
    await expect(authenticatedPage.getByTestId('equipment-grid')).toBeVisible();

    // Find an available equipment item (one with visible add-to-cart button)
    const availableEquipment = authenticatedPage
      .locator('[data-testid^="equipment-add-to-cart-"]')
      .first();
    const isVisible = await availableEquipment.isVisible().catch(() => false);

    if (!isVisible) {
      test.skip();
      return;
    }

    // Get initial cart count
    const cartCount = authenticatedPage.getByTestId('cart-item-count');
    const initialCountVisible = await cartCount.isVisible().catch(() => false);
    const initialCount = initialCountVisible
      ? parseInt((await cartCount.textContent()) || '0')
      : 0;

    // Click add to cart
    await availableEquipment.click();

    // Wait for cart count to update using explicit assertion
    await expect(cartCount).toBeVisible();

    const newCount = parseInt((await cartCount.textContent()) || '0');
    expect(newCount).toBe(initialCount + 1);
  });

  test('should navigate to cart when clicking cart indicator', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    // Wait for page to load
    await expect(authenticatedPage.getByTestId('equipment-search-container')).toBeVisible();

    // Click cart indicator
    const cartIndicator = authenticatedPage.getByTestId('cart-indicator');
    await expect(cartIndicator).toBeVisible();

    await cartIndicator.click();

    // Wait for navigation using Playwright's toHaveURL assertion
    await expect(authenticatedPage).toHaveURL(/\/(cart|checkout|reservation)/);

    // Verify reservation cart is visible
    const reservationCart = authenticatedPage.getByTestId('reservation-cart');
    await expect(reservationCart).toBeVisible();
  });
});
