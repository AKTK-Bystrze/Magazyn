import { test, expect } from "../fixtures";
import { ReservationCartPOM } from "../page-objects/reservation-cart.pom";
import { TEST_IDS } from "../constants";
import {
  clearCart,
  addToCart,
  goToCart,
  restoreCredits,
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

  test.beforeEach(async ({ authenticatedPage, supabaseAdmin, testUser }) => {
    // Store initial credits for restoration
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();

    initialCredits = data?.credit_balance ?? 100;

    // Clear cart before each test
    await clearCart(authenticatedPage);

    console.log(`[TEST SETUP] Initial credits: ${initialCredits}`);
  });

  test.afterEach(async ({ supabaseAdmin, testUser }) => {
    // Restore user credits (equipment cleanup handled by fixture)
    await restoreCredits(supabaseAdmin, testUser.id, initialCredits);
    console.log("[TEST CLEANUP] Credits restored");
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

    // 1. Navigate to equipment page and verify browsing components
    await authenticatedPage.goto("/equipment");
    await expect(
      authenticatedPage.getByRole("heading", { name: /equipment/i })
    ).toBeVisible();

    // Verify Key Browsing Elements (Replacing duplicated browsing tests)
    // 1. Search container
    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_SEARCH_CONTAINER)).toBeVisible();

    // 2. Equipment Grid
    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();

    // 3. Card Details (Status Badge & Details Button)
    // We check these on the first equipment item before adding it
    await expect(authenticatedPage.getByTestId(TEST_IDS.equipmentStatusBadge(equip1.id))).toBeVisible();
    await expect(authenticatedPage.getByTestId(TEST_IDS.equipmentDetailsButton(equip1.id))).toBeVisible();

    // 2. Add both test equipment items to cart
    await addToCart(authenticatedPage, equip1.id);
    await addToCart(authenticatedPage, equip2.id);

    // 3. VERIFY: Cart indicator shows correct count
    await expect(authenticatedPage.getByTestId(TEST_IDS.CART_ITEM_COUNT)).toHaveText(
      "2"
    );

    // 4. Navigate to cart
    await goToCart(authenticatedPage);
    await cart.waitForCartView();

    // 5. VERIFY: Cart displays all selected items (was separate test)
    await expect(cart.cartItems).toHaveCount(2);
    await expect(cart.getCartItem(equip1.id)).toBeVisible();
    await expect(cart.getCartItem(equip2.id)).toBeVisible();

    // 6. Set reservation dates
    await cart.setDatesFromNow(7, 10);

    // 7. VERIFY: Total cost displayed and > 0 (was separate test)
    const totalCost = await cart.getTotalCost();
    expect(totalCost).toBeGreaterThan(0);

    const currentBalance = await cart.getCurrentBalance();
    expect(currentBalance).toBeGreaterThan(0);

    const remainingBalance = await cart.getRemainingBalance();
    expect(remainingBalance).toBeLessThan(currentBalance);

    // 8. Verify checkout button is enabled
    const isEnabled = await cart.isCheckoutEnabled();
    expect(isEnabled).toBe(true);

    // 9. Proceed to confirmation
    await cart.proceedToConfirmation();
    await expect(cart.confirmationModal).toBeVisible();

    // 10. VERIFY: Confirmation modal shows balance info
    await expect(
      authenticatedPage.getByTestId(TEST_IDS.CONFIRMATION_CURRENT_BALANCE)
    ).toBeVisible();
    await expect(
      authenticatedPage.getByTestId(TEST_IDS.CONFIRMATION_REMAINING_BALANCE)
    ).toBeVisible();

    // 11. Confirm reservation
    await cart.confirm();

    // 12. VERIFY: Redirected to success page
    await cart.waitForSuccess();
    expect(authenticatedPage.url()).toContain("/reservations");
    expect(authenticatedPage.url()).toContain("success=true");

    // Wait for reservation list container to load (React component with async data)
    await expect(
      authenticatedPage.getByTestId(TEST_IDS.RESERVATION_LIST_CONTAINER)
    ).toBeVisible();

    // Wait for network to settle (reservation list API call to complete)
    await authenticatedPage.waitForLoadState('networkidle');

    // 13. VERIFY: Reservation appears in list
    await expect(
      authenticatedPage.locator('[data-testid^="reservation-row-"]').first()
    ).toBeVisible({ timeout: 15000 });

    // 14. Navigate to equipment page
    await authenticatedPage.goto("/equipment");

    // 15. VERIFY: Cart is cleared (was separate test)
    await expect(
      authenticatedPage.getByTestId(TEST_IDS.CART_INDICATOR)
    ).not.toBeVisible();

    console.log(`[Worker ${workerIndex}] ✅ Happy path completed`);
  });

  /**
   * Cart Management: Remove items from cart
   */
  test("Cart Management: Remove items from cart", async ({
    authenticatedPage,
    testEquipment,
    workerIndex,
  }) => {
    const [equip1] = testEquipment;
    const cart = new ReservationCartPOM(authenticatedPage);

    // 1. Add equipment to cart
    await addToCart(authenticatedPage, equip1.id);
    await goToCart(authenticatedPage);

    // 2. VERIFY: Item visible in cart
    await expect(cart.getCartItem(equip1.id)).toBeVisible();

    // 3. Remove item
    await cart.removeItem(equip1.id);

    // 4. VERIFY: Item removed, cart empty
    await expect(cart.getCartItem(equip1.id)).not.toBeVisible();
    await expect(cart.cartItems).toHaveCount(0);

    console.log(`[Worker ${workerIndex}] ✅ Cart management completed`);
  });
});
