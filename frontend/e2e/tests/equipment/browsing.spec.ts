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
  test('should display equipment grid with items', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    // Wait for the equipment search container to load
    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_SEARCH_CONTAINER)).toBeVisible();

    // Check if equipment grid is visible (not empty state)
    const equipmentGrid = authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID);
    await expect(equipmentGrid).toBeVisible();
  });

  test('should display equipment cards with details', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');

    // Wait for grid to load
    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();

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

    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_SEARCH_CONTAINER)).toBeVisible();

    // Wait for EITHER the grid OR the empty state to appear
    // This handles the loading state implicitly
    const grid = authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID);
    const emptyState = authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID_EMPTY);

    const result = await Promise.race([
      grid.waitFor({ state: 'visible' }).then(() => 'grid'),
      emptyState.waitFor({ state: 'visible' }).then(() => 'empty'),
      authenticatedPage.getByText('Error loading equipment').waitFor({ state: 'visible' }).then(() => 'error')
    ]);

    expect(result).not.toBe('error');
    expect(result).toBeTruthy();

    if (result === 'grid') {
      const cardCount = await authenticatedPage.locator('[data-testid^="equipment-card-"]').count();
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  test('should display cart indicator', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/equipment');
    await expect(authenticatedPage.getByTestId('equipment-grid')).toBeVisible();

    // Ideally, the cart indicator is hidden when empty.
    // So we must add an item to see it.
    const addToCartBtn = authenticatedPage.locator('[data-testid^="equipment-add-to-cart-"]').first();

    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();

      // Wait for the button to reflect the "Added" or "In Cart" state
      // This ensures the click was processed and state updated
      await expect(addToCartBtn).toHaveText(/Added|In Cart/);

      const cartIndicator = authenticatedPage.getByTestId(TEST_IDS.CART_INDICATOR);
      await expect(cartIndicator).toBeVisible();
    } else {
      test.skip(true, 'No available equipment to add to cart, skipping indicator check');
    }
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
    const cartCount = authenticatedPage.getByTestId(TEST_IDS.CART_ITEM_COUNT);
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
    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_SEARCH_CONTAINER)).toBeVisible();
    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();

    // Ensure we have an item in cart so indicator is visible
    const addToCartBtn = authenticatedPage.locator('[data-testid^="equipment-add-to-cart-"]').first();
    if (await addToCartBtn.isVisible()) {
      await addToCartBtn.click();
      // Wait for click to process
      await expect(addToCartBtn).toHaveText(/Added|In Cart/);
    } else {
      // If we can't add anything, we might already have things in cart from previous tests 
      // or we skip if strictly needed. Let's try to proceed only if indicator is visible or strictly add one.
      // Better safe: try to find indicator, if not visible, skip.
      const indicatorVisible = await authenticatedPage.getByTestId(TEST_IDS.CART_INDICATOR).isVisible();
      if (!indicatorVisible) {
        test.skip(true, 'Cannot test cart navigation without items in cart');
        return;
      }
    }

    // Click cart indicator
    const cartIndicator = authenticatedPage.getByTestId(TEST_IDS.CART_INDICATOR);
    await expect(cartIndicator).toBeVisible();

    await cartIndicator.click();

    // Wait for navigation using Playwright's toHaveURL assertion
    await expect(authenticatedPage).toHaveURL(/\/(cart|checkout|reservation)/);

    // Verify reservation cart is visible
    const reservationCart = authenticatedPage.getByTestId(TEST_IDS.RESERVATION_CART);
    await expect(reservationCart).toBeVisible();
  });
});
