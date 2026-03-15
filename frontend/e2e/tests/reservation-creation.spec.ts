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
      authenticatedPage.getByRole("heading", { name: /equipment|sprzęt|inwentarz/i, level: 1 })
    ).toBeVisible();

    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_SEARCH_CONTAINER)).toBeVisible();

    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();

    await expect(authenticatedPage.getByTestId(TEST_IDS.equipmentStatusBadge(equip1.id))).toBeVisible();
    await expect(authenticatedPage.getByTestId(TEST_IDS.equipmentDetailsButton(equip1.id))).toBeVisible();

    await addToCart(authenticatedPage, equip1.id);
    await addToCart(authenticatedPage, equip2.id);

    await expect(authenticatedPage.getByTestId(TEST_IDS.CART_ITEM_COUNT)).toHaveText(
      "2"
    );

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

    await expect(
      authenticatedPage.getByTestId(TEST_IDS.CONFIRMATION_CURRENT_BALANCE)
    ).toBeVisible();
    await expect(
      authenticatedPage.getByTestId(TEST_IDS.CONFIRMATION_REMAINING_BALANCE)
    ).toBeVisible();

    await cart.confirm();

    await cart.waitForSuccess();
    expect(authenticatedPage.url()).toContain("/reservations");
    expect(authenticatedPage.url()).toContain("success=true");

    await expect(
      authenticatedPage.getByTestId(TEST_IDS.RESERVATION_LIST_CONTAINER)
    ).toBeVisible();

    await expect(
      authenticatedPage.locator('[data-testid^="reservation-row-"]').first()
    ).toBeVisible({ timeout: E2E_CONFIG.TIMEOUT.ASSERTION });

    await authenticatedPage.goto("/equipment");

    await expect(
      authenticatedPage.getByTestId(TEST_IDS.CART_INDICATOR)
    ).not.toBeVisible();
  });

  /**
   * Scenario: Cart Item Removal
   * Verifies that items can be successfully removed from the cart.
   * - Adds item to cart
   * - Removes item
   * - Verifies item is gone and cart count is updated
   */
  test("Cart Management: Remove items from cart", async ({
    authenticatedPage,
    testEquipment,
  }) => {
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
   * Steps:
   * 1. Login as regular user.
   * 2. Attempt to create reservation with free_reservation=true via API.
   * 3. Verify request is rejected with 403 Forbidden.
   */
  test("Authorization: Non-admin cannot create free reservations", async ({
    authenticatedPage,
    testEquipment,
    workerIndex,
  }) => {
    const [equip1] = testEquipment;
    
    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() + startDays);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + endDays);

    const payload = {
      reservations: [{
        equipment_id: equip1.id,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
      }],
      free_reservation: true, // Non-admin trying to create free reservation
    };

    // Extract auth token from storage for API request
    const storageState = await authenticatedPage.context().storageState();
    const authToken = storageState.cookies.find(c => c.name.includes('auth-token'))?.value;
    let accessToken = '';
    if (authToken) {
      const sessionData = JSON.parse(authToken);
      accessToken = sessionData.access_token;
    }

    const response = await authenticatedPage.request.post('/api/reservations', {
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    expect(response.status()).toBe(403);
    
    const body = await response.json();
    expect(body.error || body.message).toContain('Only admins can create free reservations');
  });
});
