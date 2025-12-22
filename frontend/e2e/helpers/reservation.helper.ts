import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper functions for reservation E2E tests
 * Provides setup, teardown, and common actions
 */

/**
 * Clear the cart via localStorage
 */
export async function clearCart(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('magazyn-cart');
  });
  // Navigate to /equipment to avoid redirect loop on /dashboard
  await page.goto('/equipment', { waitUntil: 'domcontentloaded' });

  // Reset redirect history to prevent false loop detection
  await page.evaluate(() => {
    // @ts-ignore - accessing app internals for test purposes
    if (window.RedirectManager) {
      // @ts-ignore
      window.RedirectManager.reset();
    }
  });
}

/**
 * Add equipment to cart from equipment browse page
 * @param page - Playwright page
 * @param equipmentId - Equipment ID to add
 */
export async function addToCart(page: Page, equipmentId: string): Promise<void> {
  await page.goto('/equipment');
  
  // Wait for equipment to load
  await page.waitForSelector('[data-testid^="equipment-card-"]', { timeout: 10000 });
  
  // Click add to cart button
  const addButton = page.getByTestId(`equipment-add-to-cart-${equipmentId}`);
  await addButton.waitFor({ state: 'visible', timeout: 5000 });
  await addButton.click();
  
  // Wait for cart indicator to appear
  await expect(page.getByTestId('cart-indicator')).toBeVisible({ timeout: 5000 });
}

/**
 * Add multiple items to cart
 * @param page - Playwright page
 * @param equipmentIds - Array of equipment IDs to add
 */
export async function addMultipleToCart(page: Page, equipmentIds: string[]): Promise<void> {
  for (const id of equipmentIds) {
    await addToCart(page, id);
  }
}

/**
 * Navigate to cart and wait for it to load
 */
export async function goToCart(page: Page): Promise<void> {
  // Click cart indicator
  await page.getByTestId('cart-indicator').click();
  
  // Wait for cart view
  await expect(page.getByTestId('reservation-cart')).toBeVisible();
}

/**
 * Set reservation dates using relative days from now
 * @param page - Playwright page
 * @param startDays - Number of days from now for start date
 * @param endDays - Number of days from now for end date
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
  
  // Wait for cost calculation
  await page.waitForTimeout(300);
}

/**
 * Create a reservation (full flow from browsing to confirmation)
 * @param page - Playwright page
 * @param equipmentId - Equipment ID to reserve
 * @param startDays - Days from now for start
 * @param endDays - Days from now for end
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
  
  // Click checkout
  await page.getByTestId('checkout-button').click();
  
  // Wait for confirmation modal
  await expect(page.getByTestId('reservation-confirmation-modal')).toBeVisible();
  
  // Confirm
  await page.getByTestId('confirm-reservation-button').click();
  
  // Wait for success redirect
  await page.waitForURL(/\/reservations\?success=true/);
}

/**
 * Get the ID of the most recently created reservation from the list
 */
export async function getLastReservationId(page: Page): Promise<string> {
  await page.goto('/reservations');
  
  // Wait for reservations to load
  await page.waitForSelector('[data-testid^="reservation-row-"]', { timeout: 5000 });
  
  const firstRow = page.locator('[data-testid^="reservation-row-"]').first();
  const testId = await firstRow.getAttribute('data-testid');
  
  if (!testId) {
    throw new Error('Could not find reservation row');
  }
  
  return testId.replace('reservation-row-', '');
}

/**
 * Get all reservation IDs from the current page
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
 * Cancel a reservation via API using supabaseAdmin
 * DELETES the reservation to free up equipment for other tests
 * @param supabaseAdmin - Supabase admin client
 * @param reservationId - Reservation ID to cancel
 */
export async function cancelReservation(
  supabaseAdmin: SupabaseClient,
  reservationId: string
): Promise<void> {
  // DELETE the reservation to free up the equipment
  const { error } = await supabaseAdmin
    .from('reservations')
    .delete()
    .eq('id', reservationId);
    
  if (error) {
    console.error(`Failed to delete reservation ${reservationId}:`, error);
    // Don't throw - allow cleanup to continue for other reservations
  } else {
    console.log(`✅ Deleted reservation ${reservationId}`);
  }
}

/**
 * Cancel multiple reservations
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
 * Restore user credits to a specific amount
 * @param supabaseAdmin - Supabase admin client
 * @param userId - User ID
 * @param amount - Credit amount to set (default: 100)
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
    console.error('Failed to restore credits:', error);
    throw error;
  }
}

/**
 * Get user's current credit balance
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
    console.error('Failed to get user credits:', error);
    throw error;
  }
  
  return data?.credit_balance ?? 0;
}

/**
 * Wait for a specific number of reservations to appear on the page
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
 * Format date as YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date X days from now
 */
export function getDaysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}


