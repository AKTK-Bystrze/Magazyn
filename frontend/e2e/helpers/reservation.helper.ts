import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

import { E2E_CONFIG } from "../constants";

/**
 * Helper functions for reservation E2E tests
 * Provides setup, teardown, and common actions
 */

/**
 * Calculates start and end days relative to today, offset by worker index.
 * This prevents reservation grouping collisions when running tests in parallel.
 *
 * @param workerIndex - The Playwright worker index.
 * @returns Object containing startDays and endDays.
 */
export function calculateWorkerDates(workerIndex: number): { startDays: number; endDays: number } {
  const workerOffset = workerIndex * E2E_CONFIG.DEFAULTS.WORKER_DATE_OFFSET;
  const startDays = E2E_CONFIG.DEFAULTS.RESERVATION_DAYS_AHEAD + workerOffset;
  const endDays = startDays + E2E_CONFIG.DEFAULTS.RESERVATION_DURATION_DAYS;

  return { startDays, endDays };
}

/**
 * Clears the cart by removing the item from localStorage and navigating to the equipment page.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves when the cart is cleared and the page is navigated.
 */
export async function clearCart(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem("magazyn-cart");
  });
  await page.goto("/equipment", { waitUntil: "domcontentloaded" });
}

/**
 * Adds an equipment item to the cart.
 *
 * @param page - The Playwright Page instance.
 * @param equipmentId - The ID of the equipment to add.
 * @returns A promise that resolves when the item is added and the cart indicator is visible.
 */
export async function addToCart(page: Page, equipmentId: string): Promise<void> {
  await page.goto("/equipment");

  const addButton = page.getByTestId(`equipment-add-to-cart-${equipmentId}`);
  await addButton.waitFor({ state: "visible", timeout: 15000 });

  await addButton.click();

  await expect(page.getByTestId("cart-indicator")).toBeVisible({ timeout: 5000 });
}

/**
 * Navigates to the cart page by clicking the cart indicator.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves when the cart view is visible.
 */
export async function goToCart(page: Page): Promise<void> {
  await page.getByTestId("cart-indicator").click();
  await expect(page.getByTestId("reservation-cart")).toBeVisible();
}

/**
 * Restores a user's credit balance to a specific amount.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param userId - The ID of the user.
 * @param amount - The amount of credits to restore (default: 100).
 * @returns A promise that resolves when the credits are updated.
 * @throws An error if the update fails.
 */
export async function restoreCredits(
  supabaseAdmin: SupabaseClient,
  userId: string,
  amount: number = 100
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ credit_balance: amount })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}
