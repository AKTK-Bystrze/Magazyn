import { test, expect } from "../../fixtures";
import { ReservationCartPOM } from "../../page-objects/reservation-cart.pom";
import { E2E_CONFIG } from "../../constants";
import {
  addToCart,
  goToCart,
  restoreCredits,
  calculateWorkerDates,
} from "../../helpers/reservation.helper";

import type { Page, Locator } from "@playwright/test";

async function navigateToAllReservations(adminPage: Page) {
  await adminPage.goto("/admin/reservations");
  const viewModeBtn = adminPage.getByTestId("view-mode-table");
  await viewModeBtn.waitFor({ state: "visible" });
  await viewModeBtn.click();
  await expect(adminPage.locator("table")).toBeVisible();
  await adminPage.waitForSelector('[data-testid^="reservation-row-"]', { timeout: 10000 });
}

async function cancelReservationViaUI(adminPage: Page, row: Locator) {
  const actionTrigger = row.first().getByTestId("reservation-action-menu-trigger").first();
  await expect(actionTrigger).toBeVisible({ timeout: 10000 });
  await actionTrigger.click();

  const statusButton = adminPage.getByTestId("cancel-reservation-button");
  await expect(statusButton).toBeVisible({ timeout: 10000 });
  await statusButton.click();

  const confirmButton = adminPage.getByRole("button", { name: "Anuluj Rezerwację" });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await expect(confirmButton).toBeHidden({ timeout: 10000 });
}

async function rentReservationViaUI(adminPage: Page, row: Locator) {
  const actionTrigger = row.first().getByTestId("reservation-action-menu-trigger").first();
  await expect(actionTrigger).toBeVisible({ timeout: 10000 });
  await actionTrigger.click();

  const rentButton = adminPage.getByTestId("rent-reservation-button");
  await expect(rentButton).toBeVisible({ timeout: 10000 });
  await rentButton.click();
}

async function returnReservationViaUI(adminPage: Page, row: Locator) {
  const actionTrigger = row.first().getByTestId("reservation-action-menu-trigger").first();
  await expect(actionTrigger).toBeVisible({ timeout: 10000 });
  await actionTrigger.click();

  const returnButton = adminPage.getByTestId("return-reservation-button");
  await expect(returnButton).toBeVisible({ timeout: 10000 });
  await returnButton.click();

  const confirmButton = adminPage.getByRole("button", { name: "Potwierdź Zwrot" });
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await expect(confirmButton).toBeHidden({ timeout: 10000 });
}

test.describe.serial("Admin Reservation Management", () => {
  let initialUserCredits: number;

  test.beforeEach(async ({ supabaseAdmin, testUser }) => {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();

    initialUserCredits = data?.credit_balance ?? E2E_CONFIG.DEFAULTS.INITIAL_CREDITS;
  });

  test.afterEach(async ({ supabaseAdmin, testUser }) => {
    await restoreCredits(supabaseAdmin, testUser.id, initialUserCredits);
  });

  test("Happy Path: Admin creates reservation for user and cancels it", async ({
    adminPage,
    testUser,
    testEquipment,
    workerIndex,
    supabaseAdmin,
  }) => {
    test.setTimeout(60000);
    const [equip1] = testEquipment;
    const cart = new ReservationCartPOM(adminPage);

    await addToCart(adminPage, equip1.id);

    await goToCart(adminPage);
    await cart.waitForCartView();

    await cart.selectUser(testUser.email);

    // Use worker-specific date offset to prevent reservations from being grouped across parallel tests
    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);

    const totalCost = await cart.getTotalCost();
    expect(totalCost).toBeGreaterThan(0);

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    await navigateToAllReservations(adminPage);

    const row = adminPage.locator('[data-testid^="reservation-row-"]', { hasText: equip1.name });
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    const testId = await row.first().getAttribute("data-testid");
    const reservationId = testId!.replace("reservation-row-", "");

    await cancelReservationViaUI(adminPage, row);

    const statusBadge = row.first().getByTestId(`reservation-status-${reservationId}`).first();
    await expect(statusBadge).toContainText(/Anulowan[ao]/);

    const { data: profileAfterCancel } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    expect(profileAfterCancel?.credit_balance).toBe(initialUserCredits);
  });

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

    await addToCart(adminPage, equip1.id);
    await goToCart(adminPage);
    await cart.waitForCartView();
    await cart.selectUser(testUser.email);

    const freeReservationCheckbox = adminPage.getByTestId("free-reservation-checkbox");
    await expect(freeReservationCheckbox).toBeVisible();
    await freeReservationCheckbox.check();
    await expect(freeReservationCheckbox).toBeChecked();

    const { data: profileBefore } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    const balanceBefore = profileBefore?.credit_balance ?? E2E_CONFIG.DEFAULTS.INITIAL_CREDITS;
    console.log(`Test user balance before free reservation: ${balanceBefore} credits`);

    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);

    expect(await cart.getTotalCost()).toBe(0);
    expect(await cart.getCurrentBalance()).toBe(await cart.getRemainingBalance());

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    const { data: profileAfter } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    const balanceAfter = profileAfter?.credit_balance ?? 0;
    console.log(`Test user balance after free reservation: ${balanceAfter} credits`);
    expect(balanceAfter).toBe(balanceBefore);

    await navigateToAllReservations(adminPage);

    const row = adminPage.locator('[data-testid^="reservation-row-"]', { hasText: equip1.name });
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    const testId = await row.first().getAttribute("data-testid");
    const reservationId = testId!.replace("reservation-row-", "");

    const statusBadge = row.first().getByTestId(`reservation-status-${reservationId}`).first();
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText("Przyszła");
  });

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

    const { data: profileBefore } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    const balanceBefore = profileBefore?.credit_balance ?? E2E_CONFIG.DEFAULTS.INITIAL_CREDITS;

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
    expect(await cart.getCurrentBalance()).toBe(await cart.getRemainingBalance());

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    await navigateToAllReservations(adminPage);

    const row = adminPage.locator('[data-testid^="reservation-row-"]', { hasText: equip1.name });
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    const testId = await row.first().getAttribute("data-testid");
    const reservationId = testId!.replace("reservation-row-", "");

    await cancelReservationViaUI(adminPage, row);

    const statusBadge = row.first().getByTestId(`reservation-status-${reservationId}`).first();
    await expect(statusBadge).toContainText(/Anulowan[ao]/);

    const { data: profileAfter } = await supabaseAdmin
      .from("profiles")
      .select("credit_balance")
      .eq("id", testUser.id)
      .single();
    const balanceAfter = profileAfter?.credit_balance ?? 0;

    expect(balanceAfter).toBe(balanceBefore);
  });

  test("Happy Path: Complete lifecycle PENDING -> RENTED -> RETURNED", async ({
    adminPage,
    testUser,
    testEquipment,
    workerIndex,
  }) => {
    test.setTimeout(60000);
    const [equip1] = testEquipment;
    const cart = new ReservationCartPOM(adminPage);

    await addToCart(adminPage, equip1.id);
    await goToCart(adminPage);
    await cart.waitForCartView();
    await cart.selectUser(testUser.email);

    const { startDays, endDays } = calculateWorkerDates(workerIndex);
    await cart.setDatesFromNow(startDays, endDays);

    await cart.proceedToConfirmation();
    await cart.confirm();
    await cart.waitForSuccess();

    await navigateToAllReservations(adminPage);

    const row = adminPage.locator('[data-testid^="reservation-row-"]', { hasText: equip1.name });
    await expect(row.first()).toBeVisible({ timeout: 10000 });

    const testId = await row.first().getAttribute("data-testid");
    const reservationId = testId!.replace("reservation-row-", "");

    // 1. Move from PENDING to RENTED
    await rentReservationViaUI(adminPage, row);

    // Verify badge shows active or future label for rented item
    const statusBadge = row.first().getByTestId(`reservation-status-${reservationId}`).first();
    await expect(statusBadge).toBeVisible();
    await expect(statusBadge).toContainText(/Przyszła|W trakcie/);

    // Disallowed transition check: cancel button must not be available once rented
    const actionTrigger = row.first().getByTestId("reservation-action-menu-trigger").first();
    await actionTrigger.click();
    await expect(adminPage.getByTestId("cancel-reservation-button")).not.toBeVisible();
    await adminPage.keyboard.press("Escape");

    // 2. Move from RENTED to RETURNED
    await returnReservationViaUI(adminPage, row);

    // Verify badge updates to RETURNED (Zwrócona)
    await expect(statusBadge).toContainText(/Zwrócon[ao]/);
  });
});
