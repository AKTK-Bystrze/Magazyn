import { test, expect } from "../fixtures";
import { ReservationCartPOM } from "../page-objects/reservation-cart.pom";
import { TEST_IDS, E2E_CONFIG } from "../constants";
import {
  clearCart,
  addToCart,
  goToCart,
  restoreCredits,
  calculateWorkerDates,
} from "../helpers/reservation.helper";

/**
 * Reservation creation E2E tests.
 * Covers the complete workflow from equipment selection to reservation finalization.
 *
 * Uses worker-isolated fixtures:
 * - Each worker has dedicated test user and equipment
 * - Tests can run fully parallel without conflicts
 *
 * @see fixtures/index.ts for fixture implementation
 * @see page-objects/reservation-cart.pom.ts for cart interactions
 * @see helpers/reservation.helper.ts for common actions
 */
test.describe("Reservation Creation", () => {
  let initialCredits: number;

  /**
   * Setup:
   * 1. Captures initial user credits to support restoration after test.
   * 2. Clears the cart to ensure a clean state for the test.
   */
  test.beforeEach(async ({ authenticatedPage, supabaseAdmin, testUser }) => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();

    initialCredits = data?.credit_balance ?? E2E_CONFIG.DEFAULTS.INITIAL_CREDITS;

    await clearCart(authenticatedPage);
  });

  /**
   * Teardown:
   * Restores the user's credit balance to the initial value to prevent test flakiness.
   */
  test.afterEach(async ({ supabaseAdmin, testUser }) => {
    await restoreCredits(supabaseAdmin, testUser.id, initialCredits);
  });

  /**
   * Happy Path: Complete reservation flow
   * Consolidates tests for:
   * - should display cart with all selected items
   * - should show total cost for all items
   * - should complete full reservation flow with 2 items
   * - should clear cart after successful reservation
   */
  test("Happy Path: Complete reservation flow", async ({
    authenticatedPage,
    testEquipment,
    workerIndex,
  }) => {
    const [equip1, equip2] = testEquipment;
    const cart = new ReservationCartPOM(authenticatedPage);

    await authenticatedPage.goto("/equipment");
    await expect(
      authenticatedPage.getByRole("heading", { name: /^(Sprzęt|Inwentarz Sprzętu)$/i, level: 1 })
    ).toBeVisible();

    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_SEARCH_CONTAINER)).toBeVisible();

    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();

    await expect(
      authenticatedPage.getByTestId(TEST_IDS.equipmentDetailsButton(equip1.id))
    ).toBeVisible();

    await addToCart(authenticatedPage, equip1.id);
    await addToCart(authenticatedPage, equip2.id);

    await expect(authenticatedPage.getByTestId(TEST_IDS.CART_ITEM_COUNT)).toHaveText("2");

    await goToCart(authenticatedPage);
    await cart.waitForCartView();

    await expect(cart.cartItems).toHaveCount(2);
    await expect(cart.getCartItem(equip1.id)).toBeVisible();
    await expect(cart.getCartItem(equip2.id)).toBeVisible();

    // Use worker-specific date offset to prevent reservations from being grouped across parallel tests
    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);

    const totalCost = await cart.getTotalCost();
    expect(totalCost).toBeGreaterThan(0);

    const currentBalance = await cart.getCurrentBalance();
    expect(currentBalance).toBeGreaterThan(0);

    const remainingBalance = await cart.getRemainingBalance();
    expect(remainingBalance).toBeLessThan(currentBalance);

    const isEnabled = await cart.isCheckoutEnabled();
    expect(isEnabled).toBe(true);

    await cart.proceedToConfirmation();
    await expect(cart.confirmationModal).toBeVisible();

    await expect(authenticatedPage.getByTestId(TEST_IDS.CONFIRMATION_CURRENT_BALANCE)).toHaveText(
      `${currentBalance} godzinki`
    );
    await expect(authenticatedPage.getByTestId(TEST_IDS.CONFIRMATION_REMAINING_BALANCE)).toHaveText(
      `${remainingBalance} godzinki`
    );

    await cart.confirm();

    await cart.waitForSuccess();
    expect(authenticatedPage.url()).toContain("/reservations");
    expect(authenticatedPage.url()).toContain("success=true");

    await expect(authenticatedPage.getByTestId(TEST_IDS.HEADER_CREDITS_BADGE)).toHaveText(
      `Godzinki: ${remainingBalance}`
    );

    await expect(authenticatedPage.getByTestId(TEST_IDS.RESERVATION_LIST_CONTAINER)).toBeVisible();

    await expect(
      authenticatedPage.locator('[data-testid^="reservation-row-"]').first()
    ).toBeVisible({ timeout: E2E_CONFIG.TIMEOUT.ASSERTION });

    await authenticatedPage.goto("/equipment");

    await expect(authenticatedPage.getByTestId(TEST_IDS.CART_INDICATOR)).not.toBeVisible();
  });

  /**
   * Scenario: Cart Item Removal
   * Verifies that items can be successfully removed from the cart.
   * - Adds item to cart
   * - Removes item
   * - Verifies item is gone and cart count is updated
   */
  test("Cart Management: Remove items from cart", async ({ authenticatedPage, testEquipment }) => {
    const [equip1] = testEquipment;
    const cart = new ReservationCartPOM(authenticatedPage);

    await addToCart(authenticatedPage, equip1.id);
    await goToCart(authenticatedPage);

    await expect(cart.getCartItem(equip1.id)).toBeVisible();

    await cart.removeItem(equip1.id);

    await expect(cart.getCartItem(equip1.id)).not.toBeVisible();
    await expect(cart.cartItems).toHaveCount(0);
  });

  /**
   * Scenario: Non-admin cannot create free reservations
   *
   * Verifies that regular users cannot create free reservations via UI:
   * - Free reservation toggle/checkbox is not available to non-admins
   * - Standard credit cost is strictly required and displayed in checkout
   */
  test("Authorization: Non-admin cannot create free reservations", async ({
    authenticatedPage,
    testEquipment,
    workerIndex,
  }) => {
    const [equip1] = testEquipment;
    const cart = new ReservationCartPOM(authenticatedPage);

    await addToCart(authenticatedPage, equip1.id);
    await goToCart(authenticatedPage);
    await cart.waitForCartView();

    // Verify UI strictly prohibits free reservations for non-admin
    await expect(authenticatedPage.getByTestId("free-reservation-checkbox")).not.toBeVisible();
    await expect(authenticatedPage.getByRole("checkbox", { name: /darmowa/i })).not.toBeVisible();

    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);

    const cost = await cart.getTotalCost();
    expect(cost).toBeGreaterThan(0);

    const currentBalance = await cart.getCurrentBalance();
    const remainingBalance = await cart.getRemainingBalance();
    expect(remainingBalance).toBe(currentBalance - cost);
  });

  /**
   * Scenario: Sequential back-to-back reservations with reactive balance updates
   *
   * Verifies:
   * - Performs two consecutive reservations in the same session without page reloads or API resets.
   * - Asserts that the second reservation's cart immediately reflects the deducted credit balance.
   */
  test("Reactive Balance: Sequential back-to-back reservations update credit balance in UI without page reload", async ({
    authenticatedPage,
    testEquipment,
    workerIndex,
  }) => {
    const [equip1, equip2] = testEquipment;
    const cart = new ReservationCartPOM(authenticatedPage);

    // Reservation 1: Add equip1 to cart
    await authenticatedPage.goto("/equipment");
    await addToCart(authenticatedPage, equip1.id);
    await goToCart(authenticatedPage);
    await cart.waitForCartView();

    const initialBalance = await cart.getCurrentBalance();
    expect(initialBalance).toBeGreaterThan(0);

    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);

    const cost1 = await cart.getTotalCost();
    expect(cost1).toBeGreaterThan(0);
    const expectedBalanceAfterRes1 = initialBalance - cost1;

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    expect(authenticatedPage.url()).toContain("/reservations");
    expect(authenticatedPage.url()).toContain("success=true");

    await expect(authenticatedPage.getByTestId(TEST_IDS.HEADER_CREDITS_BADGE)).toHaveText(
      `Godzinki: ${expectedBalanceAfterRes1}`
    );

    // Reservation 2: In the SAME session, navigate back to /equipment without page reload or API reset
    await authenticatedPage.goto("/equipment");
    await addToCart(authenticatedPage, equip2.id);
    await goToCart(authenticatedPage);
    await cart.waitForCartView();

    // Verify reactive credit balance in UI matches updated balance after Reservation 1
    const secondCartInitialBalance = await cart.getCurrentBalance();
    expect(secondCartInitialBalance).toBe(expectedBalanceAfterRes1);

    // Select non-overlapping dates for second reservation
    await cart.setDatesFromNow(startDays + 10, endDays + 10);
    const cost2 = await cart.getTotalCost();
    expect(cost2).toBeGreaterThan(0);

    const expectedBalanceAfterRes2 = secondCartInitialBalance - cost2;
    const remainingBalance2 = await cart.getRemainingBalance();
    expect(remainingBalance2).toBe(expectedBalanceAfterRes2);

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    expect(authenticatedPage.url()).toContain("/reservations");
    expect(authenticatedPage.url()).toContain("success=true");

    await expect(authenticatedPage.getByTestId(TEST_IDS.HEADER_CREDITS_BADGE)).toHaveText(
      `Godzinki: ${expectedBalanceAfterRes2}`
    );
  });

  /**
   * Scenario: Free reservation checkbox is not visible for non-admin users
   *
   * Steps:
   * 1. Login as a regular user.
   * 2. Add equipment to cart and navigate to cart.
   * 3. Assert the free-reservation-checkbox is not rendered.
   */
  test("Authorization: Free reservation checkbox is not visible for non-admin users", async ({
    authenticatedPage,
    testEquipment,
  }) => {
    const [equip1] = testEquipment;

    await addToCart(authenticatedPage, equip1.id);
    await goToCart(authenticatedPage);

    await expect(authenticatedPage.getByTestId("free-reservation-checkbox")).not.toBeVisible({
      timeout: 3000,
    });
  });

  /**
   * Test: Super admin can access and see free reservation toggle in checkout.
   *
   * Verifies super_admin role permissions in reservation checkout.
   */
  test("Authorization: Super admin can access free reservation toggle", async ({
    superAdminPage,
    testEquipment,
  }) => {
    const [equip1] = testEquipment;

    await addToCart(superAdminPage, equip1.id);
    await goToCart(superAdminPage);

    await expect(superAdminPage.getByTestId("free-reservation-checkbox")).toBeVisible({
      timeout: 5000,
    });
  });
});
