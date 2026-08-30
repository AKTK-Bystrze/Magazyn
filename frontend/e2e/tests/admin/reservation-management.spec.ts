import { test, expect } from "../../fixtures";
import { ReservationCartPOM } from "../../page-objects/reservation-cart.pom";
import { E2E_CONFIG } from "../../constants";
import {
  addToCart,
  goToCart,
  restoreCredits,
  calculateWorkerDates,
} from "../../helpers/reservation.helper";

/**
 * Admin Reservation Management E2E tests.
 * Covers scenarios where an Admin creates and manages reservations for other users.
 */
test.describe.serial("Admin Reservation Management", () => {
  let initialUserCredits: number;

  /**
   * Setup:
   * 1. Captures initial PUBLIC user credits (not admin) to support restoration.
   *    Note: Admin uses their own session but creates reservation for the public test user.
   */
  test.beforeEach(async ({ supabaseAdmin, testUser }) => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();

    initialUserCredits = data?.credit_balance ?? E2E_CONFIG.DEFAULTS.INITIAL_CREDITS;
  });

  /**
   * Teardown:
   * Restores the PUBLIC user's credit balance.
   */
  test.afterEach(async ({ supabaseAdmin, testUser }) => {
    // Restore credits for the user who received the reservation (target user)
    await restoreCredits(supabaseAdmin, testUser.id, initialUserCredits);
  });

  /**
   * Scenario: Admin creates reservation for user and denies it
   *
   * Steps:
   * 1. Login as Admin.
   * 2. Add item to Admin's cart.
   * 3. In Cart, select the Standard Test User as the target.
   * 4. Checkout.
   * 5. Verify success.
   * 6. Go to All Reservations.
   * 7. Find the reservation and mark as Denied.
   * 8. Verify status.
   */
  test("Happy Path: Admin creates reservation for user and denies it", async ({
    adminPage,
    testUser,
    testEquipment,
    workerIndex,
  }) => {
    test.setTimeout(60000);
    const [equip1] = testEquipment;
    const cart = new ReservationCartPOM(adminPage);

    // 1. Add equipment to cart as Admin
    await addToCart(adminPage, equip1.id);

    // 2. Go to Cart
    await goToCart(adminPage);
    await cart.waitForCartView();

    // 3. Select Target User (Standard Test User)
    await cart.selectUser(testUser.email);

    // 4. Configure Dates and Checkout
    // Use worker-specific date offset to prevent reservations from being grouped across parallel tests
    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);

    // Verify credits are displayed (sanity check)
    // Note: This might show the selected user's credits if the UI updates correctly
    const totalCost = await cart.getTotalCost();
    expect(totalCost).toBeGreaterThan(0);

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    // 5. Navigate to "All Reservations" to Manage it
    await adminPage.goto("/admin/reservations");

    // Find the reservation by equipment name (worker-isolated, unique per test)
    await adminPage.waitForSelector('[data-testid^="reservation-row-"]', { timeout: 10000 });

    // Find the row containing our equipment name (unique per test via timestamp)
    const row = adminPage.locator('[data-testid^="reservation-row-"]', { hasText: equip1.name });
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    // Get the reservation ID from the row
    const testId = await row.first().getAttribute("data-testid");
    const reservationId = testId!.replace("reservation-row-", "");

    // 6. Deny the Reservation
    // Clicking "Change Status" button/menu
    // Note: Assuming a UI specific implementation here based on typical Shadcn patterns in this project
    // If exact IDs are missing, we use role based locators.

    const statusButton = row.first().getByTestId("cancel-reservation-button");
    await expect(statusButton).toBeVisible({ timeout: 10000 });
    await statusButton.click();

    // Confirm action in dialog
    const confirmButton = adminPage.getByRole("button", { name: "Cancel Reservation" });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // 7. Verify Status
    // Wait for the status badge to update
    const statusBadge = row.first().getByTestId(`reservation-status-${reservationId}`);
    await expect(statusBadge).toContainText(/Anulowana|Denied/i);
    // double check color/class if possible, but text is good enough for now
  });

  /**
   * Scenario: Admin creates free reservation for user
   *
   * Steps:
   * 1. Login as Admin.
   * 2. Add item to Admin's cart.
   * 3. In Cart, select the Standard Test User as the target.
   * 4. Enable "Free Reservation" checkbox.
   * 5. Verify cost shows 0.
   * 6. Checkout.
   * 7. Verify user's balance is unchanged.
   * 8. Verify reservation was created with 0 cost.
   */
  test("Happy Path: Admin creates free reservation for user", async ({
    adminPage,
    testUser,
    testEquipment,
    workerIndex,
    supabaseAdmin,
  }) => {
    test.setTimeout(60000);
    const [equip1] = testEquipment;
    const cart = new ReservationCartPOM(adminPage);

    // 1. Add equipment to cart as Admin
    await addToCart(adminPage, equip1.id);

    // 2. Go to Cart
    await goToCart(adminPage);
    await cart.waitForCartView();

    // 3. Select Target User (Standard Test User)
    await cart.selectUser(testUser.email);

    // 4. Enable Free Reservation checkbox
    const freeReservationCheckbox = adminPage.getByTestId("free-reservation-checkbox");
    await expect(freeReservationCheckbox).toBeVisible();
    await freeReservationCheckbox.check();
    await expect(freeReservationCheckbox).toBeChecked();

    // 5. Get user's initial balance before creating free reservation
    const { data: profileBefore } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    const balanceBefore = profileBefore?.credit_balance ?? E2E_CONFIG.DEFAULTS.INITIAL_CREDITS;
    console.log(`Test user balance before free reservation: ${balanceBefore} credits`);

    // 6. Configure Dates
    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);

    // 7. Verify cost is 0 for free reservation
    const totalCost = await cart.getTotalCost();
    expect(totalCost).toBe(0);

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    // 8. Verify user's balance is unchanged
    const { data: profileAfter } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    const balanceAfter = profileAfter?.credit_balance ?? 0;
    console.log(`Test user balance after free reservation: ${balanceAfter} credits`);
    expect(balanceAfter).toBe(balanceBefore);

    // 9. Navigate to "All Reservations" to verify the reservation
    await adminPage.goto("/admin/reservations");

    await adminPage.waitForSelector('[data-testid^="reservation-row-"]', { timeout: 10000 });

    const row = adminPage.locator('[data-testid^="reservation-row-"]', { hasText: equip1.name });
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    // Verify the reservation was created successfully and check for free indicator
    const testId = await row.first().getAttribute("data-testid");
    const reservationId = testId!.replace("reservation-row-", "");

    const statusBadge = row.first().getByTestId(`reservation-status-${reservationId}`);
    await expect(statusBadge).toContainText(/Pending|Oczekuje|Oczekuj[aą]ca/i);

    // Note: The UI doesn't currently display a visual indicator for free reservations.
    // This could be enhanced in the future to show a badge or label for free reservations.
  });

  /**
   * Scenario: Cancelling a free reservation does not refund credits
   *
   * Steps:
   * 1. Login as Admin.
   * 2. Create a free reservation for the test user.
   * 3. Navigate to All Reservations.
   * 4. Cancel the reservation via the UI.
   * 5. Verify the user's credit balance is unchanged.
   */
  test("Free Reservation: Cancelling does not refund credits", async ({
    adminPage,
    testUser,
    testEquipment,
    workerIndex,
    supabaseAdmin,
  }) => {
    test.setTimeout(60000);
    const [equip1] = testEquipment;
    const cart = new ReservationCartPOM(adminPage);

    // 1. Capture balance before
    const { data: profileBefore } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    const balanceBefore = profileBefore?.credit_balance ?? E2E_CONFIG.DEFAULTS.INITIAL_CREDITS;

    // 2. Create a free reservation
    await addToCart(adminPage, equip1.id);
    await goToCart(adminPage);
    await cart.waitForCartView();
    await cart.selectUser(testUser.email);

    const freeCheckbox = adminPage.getByTestId("free-reservation-checkbox");
    await expect(freeCheckbox).toBeVisible();
    await freeCheckbox.check();
    await expect(freeCheckbox).toBeChecked();

    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);
    expect(await cart.getTotalCost()).toBe(0);

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    // 3. Go to All Reservations and find the row
    await adminPage.goto("/admin/reservations");
    await adminPage.waitForSelector('[data-testid^="reservation-row-"]', { timeout: 10000 });

    const row = adminPage.locator('[data-testid^="reservation-row-"]', { hasText: equip1.name });
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    const testId = await row.first().getAttribute("data-testid");
    const reservationId = testId!.replace("reservation-row-", "");

    // 4. Cancel the reservation
    const cancelButton = row.first().getByTestId("cancel-reservation-button");
    await expect(cancelButton).toBeVisible({ timeout: 10000 });
    await cancelButton.click();

    const confirmButton = adminPage.getByRole("button", { name: "Cancel Reservation" });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    const statusBadge = row.first().getByTestId(`reservation-status-${reservationId}`);
    await expect(statusBadge).toContainText(/Anulowana|Denied/i);

    // 5. Verify balance unchanged
    const { data: profileAfter } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    const balanceAfter = profileAfter?.credit_balance ?? 0;

    expect(balanceAfter).toBe(balanceBefore);
  });
});
