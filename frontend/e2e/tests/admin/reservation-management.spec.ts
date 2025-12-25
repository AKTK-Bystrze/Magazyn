import { test, expect } from '../../fixtures';
import { ReservationCartPOM } from '../../page-objects/reservation-cart.pom';
import { E2E_CONFIG } from '../../constants';
import { addToCart, goToCart, restoreCredits, calculateWorkerDates } from '../../helpers/reservation.helper';

/**
 * Admin Reservation Management E2E tests.
 * Covers scenarios where an Admin creates and manages reservations for other users.
 */
test.describe('Admin Reservation Management', () => {
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
  test('Happy Path: Admin creates reservation for user and denies it', async ({
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
    await adminPage.goto('/admin/reservations');
    
    // Find the reservation by equipment name (worker-isolated, unique per test)
    await adminPage.waitForSelector('[data-testid^="reservation-row-"]', { timeout: 10000 });

    // Find the row containing our equipment name (unique per test via timestamp)
    const row = adminPage.locator('[data-testid^="reservation-row-"]', { hasText: equip1.name });
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    // Get the reservation ID from the row
    const testId = await row.first().getAttribute('data-testid');
    const reservationId = testId!.replace('reservation-row-', '');

    // 6. Deny the Reservation
    // Clicking "Change Status" button/menu
    // Note: Assuming a UI specific implementation here based on typical Shadcn patterns in this project
    // If exact IDs are missing, we use role based locators.
    
    const statusButton = row.first().getByTestId('cancel-reservation-button');
    await expect(statusButton).toBeVisible({ timeout: 10000 });
    await statusButton.click();
    
    // Confirm action in dialog
    const confirmButton = adminPage.getByRole('button', { name: 'Cancel Reservation' });
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // 7. Verify Status
    // Wait for the status badge to update
    const statusBadge = row.first().getByTestId(`reservation-status-${reservationId}`);
    await expect(statusBadge).toContainText(/Anulowana|Denied/i);
    // double check color/class if possible, but text is good enough for now
  });
});
