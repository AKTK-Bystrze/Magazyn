import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper functions for reservation E2E tests
 * Provides setup, teardown, and common actions
 */

/**
 * Clears the cart by removing the item from localStorage and navigating to the equipment page.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves when the cart is cleared and the page is navigated.
 */
export async function clearCart(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('magazyn-cart');
  });
  await page.goto('/equipment', { waitUntil: 'domcontentloaded' });
}

/**
 * Adds an equipment item to the cart.
 *
 * @param page - The Playwright Page instance.
 * @param equipmentId - The ID of the equipment to add.
 * @returns A promise that resolves when the item is added and the cart indicator is visible.
 */
export async function addToCart(page: Page, equipmentId: string): Promise<void> {
  await page.goto('/equipment');

  const addButton = page.getByTestId(`equipment-add-to-cart-${equipmentId}`);
  await addButton.waitFor({ state: 'visible', timeout: 15000 });
  
  await addButton.click();

  await expect(page.getByTestId('cart-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Adds multiple equipment items to the cart.
 *
 * @param page - The Playwright Page instance.
 * @param equipmentIds - An array of equipment IDs to add.
 * @returns A promise that resolves when all items are added.
 */
export async function addMultipleToCart(page: Page, equipmentIds: string[]): Promise<void> {
  for (const id of equipmentIds) {
    await addToCart(page, id);
  }
}

/**
 * Navigates to the cart page by clicking the cart indicator.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves when the cart view is visible.
 */
export async function goToCart(page: Page): Promise<void> {
  await page.getByTestId('cart-indicator').click();
  await expect(page.getByTestId('reservation-cart')).toBeVisible();
}

/**
 * Sets the reservation start and end dates relative to the current date.
 *
 * @param page - The Playwright Page instance.
 * @param startDays - The number of days from now to set the start date.
 * @param endDays - The number of days from now to set the end date.
 * @returns A promise that resolves when the dates are filled.
 */
export async function setDates(page: Page, startDays: number, endDays: number): Promise<void> {
  const start = new Date();
  start.setDate(start.getDate() + startDays);
  const end = new Date();
  end.setDate(end.getDate() + endDays);
  
  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];
  
  await page.getByTestId('start-date-input').fill(startStr);
  await page.getByTestId('end-date-input').fill(endStr);
}

/**
 * Creates a complete reservation flow from adding an item to confirmation.
 *
 * @param page - The Playwright Page instance.
 * @param equipmentId - The ID of the equipment to reserve.
 * @param startDays - The number of days from now for the reservation start date.
 * @param endDays - The number of days from now for the reservation end date.
 * @returns A promise that resolves when the reservation success URL is reached.
 */
export async function createReservation(
  page: Page,
  equipmentId: string,
  startDays: number,
  endDays: number
): Promise<void> {
  await addToCart(page, equipmentId);
  await goToCart(page);
  await setDates(page, startDays, endDays);

  await page.getByTestId('checkout-button').click();

  await expect(page.getByTestId('reservation-confirmation-modal')).toBeVisible();

  await page.getByTestId('confirm-reservation-button').click();

  await page.waitForURL(/\/reservations\?success=true/);
}

/**
 * Retrieves the ID of the most recently created reservation from the reservation list.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves to the reservation ID.
 * @throws An error if no reservation row is found.
 */
export async function getLastReservationId(page: Page): Promise<string> {
  await page.goto('/reservations');

  await page.waitForSelector('[data-testid^="reservation-row-"]', { timeout: 5000 });
  
  const firstRow = page.locator('[data-testid^="reservation-row-"]').first();
  const testId = await firstRow.getAttribute('data-testid');
  
  if (!testId) {
    throw new Error('Could not find reservation row');
  }
  
  return testId.replace('reservation-row-', '');
}

/**
 * Retrieves all reservation IDs visible on the current page.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves to an array of reservation IDs.
 */
export async function getAllReservationIds(page: Page): Promise<string[]> {
  const rows = page.locator('[data-testid^="reservation-row-"]');
  const count = await rows.count();
  
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const testId = await rows.nth(i).getAttribute('data-testid');
    if (testId) {
      ids.push(testId.replace('reservation-row-', ''));
    }
  }
  
  return ids;
}

/**
 * Cancels a reservation by deleting it from the database via the admin client.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param reservationId - The ID of the reservation to cancel.
 * @returns A promise that resolves when the reservation is deleted.
 * @throws An error if the deletion fails.
 */
export async function cancelReservation(
  supabaseAdmin: SupabaseClient,
  reservationId: string
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('reservations')
    .delete()
    .eq('id', reservationId);
    
  if (error) {
    throw error;
  }
}

/**
 * Cancels multiple reservations by their IDs.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param reservationIds - An array of reservation IDs to cancel.
 * @returns A promise that resolves when all reservations are deleted.
 */
export async function cancelReservations(
  supabaseAdmin: SupabaseClient,
  reservationIds: string[]
): Promise<void> {
  for (const id of reservationIds) {
    await cancelReservation(supabaseAdmin, id);
  }
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
    .from('profiles')
    .update({ credit_balance: amount })
    .eq('id', userId);
    
  if (error) {
    throw error;
  }
}

/**
 * Retrieves the current credit balance for a user.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param userId - The ID of the user.
 * @returns A promise that resolves to the user's credit balance.
 * @throws An error if the retrieval fails.
 */
export async function getUserCredits(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('credit_balance')
    .eq('id', userId)
    .single();
    
  if (error) {
    throw error;
  }
  
  return data?.credit_balance ?? 0;
}

/**
 * Waits for a specific number of reservation rows to appear on the page.
 *
 * @param page - The Playwright Page instance.
 * @param expectedCount - The expected number of reservation rows.
 * @param timeout - The timeout in milliseconds (default: 5000).
 * @returns A promise that resolves via waitForFunction when the count is met.
 */
export async function waitForReservationCount(
  page: Page,
  expectedCount: number,
  timeout: number = 5000
): Promise<void> {
  await page.waitForFunction(
    (count) => {
      const rows = document.querySelectorAll('[data-testid^="reservation-row-"]');
      return rows.length >= count;
    },
    expectedCount,
    { timeout }
  );
}

/**
 * Formats a Date object into a YYYY-MM-DD string.
 *
 * @param date - The Date object to format.
 * @returns The formatted date string.
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Calculates a date that is a specific number of days from now.
 *
 * @param days - The number of days to add to the current date.
 * @returns The calculated Date object.
 */
export function getDaysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}


