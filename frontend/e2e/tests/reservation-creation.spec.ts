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

test.describe("Reservation Creation", () => {
  let initialCredits: number;

  test.beforeEach(async ({ authenticatedPage, supabaseAdmin, testUser }) => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();

    initialCredits = data?.credit_balance ?? E2E_CONFIG.DEFAULTS.INITIAL_CREDITS;

    await clearCart(authenticatedPage);
  });

  test.afterEach(async ({ supabaseAdmin, testUser }) => {
    await restoreCredits(supabaseAdmin, testUser.id, initialCredits);
  });

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

  test("Reactive Balance: Sequential back-to-back reservations update credit balance in UI without page reload", async ({
    authenticatedPage,
    testEquipment,
    workerIndex,
  }) => {
    const [equip1, equip2] = testEquipment;
    const cart = new ReservationCartPOM(authenticatedPage);

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

    await authenticatedPage.goto("/equipment");
    await addToCart(authenticatedPage, equip2.id);
    await goToCart(authenticatedPage);
    await cart.waitForCartView();

    const secondCartInitialBalance = await cart.getCurrentBalance();
    expect(secondCartInitialBalance).toBe(expectedBalanceAfterRes1);

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
