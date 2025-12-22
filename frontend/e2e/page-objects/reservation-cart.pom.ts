import type { Page, Locator } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Page Object Model for Reservation Cart and Checkout Flow
 * Encapsulates interactions with cart, date selection, and confirmation
 */
export class ReservationCartPOM {
  readonly page: Page;
  
  // Main sections
  readonly cartView: Locator;
  readonly dateRangePicker: Locator;
  readonly costEstimator: Locator;
  readonly confirmationModal: Locator;
  
  // Cart elements
  readonly cartItems: Locator;
  readonly checkoutButton: Locator;
  
  // Date picker elements
  readonly startDateInput: Locator;
  readonly endDateInput: Locator;
  
  // Cost displays
  readonly currentBalance: Locator;
  readonly totalCost: Locator;
  readonly remainingBalance: Locator;
  
  // Confirmation elements
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  
  // Error elements
  readonly insufficientCreditsError: Locator;
  readonly conflictError: Locator;

  constructor(page: Page) {
    this.page = page;
    
    // Main sections
    this.cartView = page.getByTestId("reservation-cart");
    this.dateRangePicker = page.getByTestId("date-range-picker");
    this.costEstimator = page.getByTestId("cost-estimator");
    this.confirmationModal = page.getByTestId("reservation-confirmation-modal");
    
    // Cart elements
    this.cartItems = page.locator('[data-testid^="cart-item-"]:not([data-testid*="-remove-"])');
    this.checkoutButton = page.getByTestId("checkout-button");
    
    // Date picker
    this.startDateInput = page.getByTestId("start-date-input");
    this.endDateInput = page.getByTestId("end-date-input");
    
    // Cost displays
    this.currentBalance = page.getByTestId("current-credit-balance");
    this.totalCost = page.getByTestId("reservation-total-cost");
    this.remainingBalance = page.getByTestId("remaining-credit-balance");
    
    // Confirmation
    this.confirmButton = page.getByTestId("confirm-reservation-button");
    this.cancelButton = page.getByTestId("cancel-confirmation-button");
    
    // Errors
    this.insufficientCreditsError = page.getByTestId("error-insufficient-credits");
    this.conflictError = page.getByTestId("error-reservation-conflict");
  }

  /**
   * Navigate to the cart page
   */
  async goto() {
    await this.page.goto("/reservations/create");
    await expect(this.cartView).toBeVisible();
  }

  /**
   * Wait for cart view to be visible
   */
  async waitForCartView() {
    await expect(this.cartView).toBeVisible();
  }

  /**
   * Get count of items in cart
   */
  async getItemCount(): Promise<number> {
    return await this.cartItems.count();
  }

  /**
   * Get specific cart item by equipment ID
   */
  getCartItem(equipmentId: string): Locator {
    return this.page.getByTestId(`cart-item-${equipmentId}`);
  }

  /**
   * Remove item from cart by equipment ID
   */
  async removeItem(equipmentId: string): Promise<void> {
    const removeButton = this.page.getByTestId(`cart-item-remove-${equipmentId}`);
    await removeButton.click();
    
    // Wait for item to be removed
    await expect(this.getCartItem(equipmentId)).not.toBeVisible();
  }

  /**
   * Set reservation dates
   * @param startDate - ISO date string (YYYY-MM-DD)
   * @param endDate - ISO date string (YYYY-MM-DD)
   */
  async setDates(startDate: string, endDate: string): Promise<void> {
    // Set start date
    await this.startDateInput.fill(startDate);
    await this.page.waitForTimeout(200);
    
    // Set end date
    await this.endDateInput.fill(endDate);
    await this.page.waitForTimeout(200);
    
    // Wait for the button to become enabled (indicates validation passed)
    // Increased timeout to handle slower network/processing
    try {
      await expect(this.checkoutButton).toBeEnabled({ timeout: 10000 });
    } catch (e) {
      // If button doesn't become enabled, log current values for debugging
      const startVal = await this.startDateInput.inputValue();
      const endVal = await this.endDateInput.inputValue();
      console.log(`Dates not processed. Start: ${startVal}, End: ${endVal}`);
      throw e;
    }
  }

  /**
   * Set dates X days from now
   * @param startDaysFromNow - Days from now for start date
   * @param endDaysFromNow - Days from now for end date
   */
  async setDatesFromNow(startDaysFromNow: number, endDaysFromNow: number): Promise<void> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + startDaysFromNow);
    
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + endDaysFromNow);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    await this.setDates(startDateStr, endDateStr);
  }

  /**
   * Get total cost value
   */
  async getTotalCost(): Promise<number> {
    const text = await this.totalCost.textContent();
    if (!text) return 0;
    
    // Extract number from "-X credits" format
    const match = text.match(/-?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get current credit balance
   */
  async getCurrentBalance(): Promise<number> {
    const text = await this.currentBalance.textContent();
    if (!text) return 0;
    
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get remaining balance after reservation
   */
  async getRemainingBalance(): Promise<number> {
    const text = await this.remainingBalance.textContent();
    if (!text) return 0;
    
    const match = text.match(/-?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Click checkout button to proceed to confirmation
   */
  async proceedToConfirmation(): Promise<void> {
    await this.checkoutButton.click();
    
    // Wait for confirmation modal to appear
    await expect(this.confirmationModal).toBeVisible();
  }

  /**
   * Confirm reservation in the modal
   */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /**
   * Cancel confirmation and return to cart
   */
  async cancelConfirmation(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.confirmationModal).not.toBeVisible();
  }

  /**
   * Wait for success and redirect to reservations page
   */
  async waitForSuccess(): Promise<void> {
    await this.page.waitForURL(/\/reservations\?success=true/);
  }

  /**
   * Check if insufficient credits error is visible
   */
  async hasInsufficientCreditsError(): Promise<boolean> {
    return await this.insufficientCreditsError.isVisible();
  }

  /**
   * Check if conflict error is visible
   */
  async hasConflictError(): Promise<boolean> {
    return await this.conflictError.isVisible();
  }

  /**
   * Check if checkout button is enabled
   */
  async isCheckoutEnabled(): Promise<boolean> {
    return await this.checkoutButton.isEnabled();
  }

  /**
   * Complete full checkout flow (dates → confirm → wait for success)
   */
  async completeCheckout(startDaysFromNow: number, endDaysFromNow: number): Promise<void> {
    await this.setDatesFromNow(startDaysFromNow, endDaysFromNow);
    await this.proceedToConfirmation();
    await this.confirm();
    await this.waitForSuccess();
  }
}
