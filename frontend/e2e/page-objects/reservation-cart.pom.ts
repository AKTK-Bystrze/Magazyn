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
   * Navigates to the reservation cart page.
   *
   * @returns A promise that resolves when the cart view is visible.
   */
  async goto(): Promise<void> {
    await this.page.goto("/reservations/create");
    await expect(this.cartView).toBeVisible();
  }

  /**
   * Waits for the cart view container to be visible.
   *
   * @returns A promise that resolves when the cart view is visible.
   */
  async waitForCartView(): Promise<void> {
    await expect(this.cartView).toBeVisible();
  }

  /**
   * Gets the total number of items currently in the cart.
   *
   * @returns A promise that resolves to the count of cart items.
   */
  async getItemCount(): Promise<number> {
    return await this.cartItems.count();
  }

  /**
   * Gets the locator for a specific cart item row.
   *
   * @param equipmentId - The ID of the equipment to locate.
   * @returns The Locator for the specified cart item.
   */
  getCartItem(equipmentId: string): Locator {
    return this.page.getByTestId(`cart-item-${equipmentId}`);
  }

  /**
   * Removes a specific item from the cart.
   *
   * @param equipmentId - The ID of the equipment to remove.
   * @returns A promise that resolves when the item is no longer visible in the cart.
   */
  async removeItem(equipmentId: string): Promise<void> {
    const removeButton = this.page.getByTestId(`cart-item-remove-${equipmentId}`);
    await removeButton.click();
    
    // Wait for item to be removed
    await expect(this.getCartItem(equipmentId)).not.toBeVisible();
  }

  /**
   * Sets the reservation start and end dates in the date picker.
   *
   * @param startDate - The start date string in ISO format (YYYY-MM-DD).
   * @param endDate - The end date string in ISO format (YYYY-MM-DD).
   * @returns A promise that resolves when dates are set and checkout is enabled.
   */
  async setDates(startDate: string, endDate: string): Promise<void> {
    await this.startDateInput.fill(startDate);
    await this.endDateInput.fill(endDate);

    await expect(this.checkoutButton).toBeEnabled({ timeout: 10000 });
  }

  /**
   * Sets reservation dates calculated from the current date.
   *
   * @param startDaysFromNow - The number of days from now for the start date.
   * @param endDaysFromNow - The number of days from now for the end date.
   * @returns A promise that resolves when the dates are set.
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
   * Gets the total reservation cost from the cost estimator.
   *
   * @returns A promise that resolves to the total cost as a number.
   */
  async getTotalCost(): Promise<number> {
    const text = await this.totalCost.textContent();
    if (!text) return 0;
    
    // Extract number from "-X credits" format
    const match = text.match(/-?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Gets the current user credit balance.
   *
   * @returns A promise that resolves to the current balance.
   */
  async getCurrentBalance(): Promise<number> {
    const text = await this.currentBalance.textContent();
    if (!text) return 0;
    
    const match = text.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Gets the projected remaining balance after the reservation.
   *
   * @returns A promise that resolves to the remaining balance.
   */
  async getRemainingBalance(): Promise<number> {
    const text = await this.remainingBalance.textContent();
    if (!text) return 0;
    
    const match = text.match(/-?(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Clicks the checkout button to open the confirmation modal.
   *
   * @returns A promise that resolves when the confirmation modal is visible.
   */
  async proceedToConfirmation(): Promise<void> {
    await this.checkoutButton.click();
    
    // Wait for confirmation modal to appear
    await expect(this.confirmationModal).toBeVisible();
  }

  /**
   * Confirm reservation in the modal
   *
   * @returns A promise that resolves when the button is clicked.
   */
  async confirm(): Promise<void> {
    await this.confirmButton.click();
  }

  /**
   * Cancels the reservation confirmation and closes the modal.
   *
   * @returns A promise that resolves when the modal is no longer visible.
   */
  async cancelConfirmation(): Promise<void> {
    await this.cancelButton.click();
    await expect(this.confirmationModal).not.toBeVisible();
  }

  /**
   * Waits for the successful reservation redirect URL.
   *
   * @returns A promise that resolves when the URL matches the success pattern.
   */
  async waitForSuccess(): Promise<void> {
    await this.page.waitForURL(/\/reservations\?success=true/);
  }

  /**
   * Checks if the insufficient credits error is displayed.
   *
   * @returns A promise that resolves to true if the error is visible.
   */
  async hasInsufficientCreditsError(): Promise<boolean> {
    return await this.insufficientCreditsError.isVisible();
  }

  /**
   * Checks if the reservation conflict error is displayed.
   *
   * @returns A promise that resolves to true if the error is visible.
   */
  async hasConflictError(): Promise<boolean> {
    return await this.conflictError.isVisible();
  }

  /**
   * Checks if the checkout button is enabled.
   *
   * @returns A promise that resolves to true if enabled.
   */
  async isCheckoutEnabled(): Promise<boolean> {
    return await this.checkoutButton.isEnabled();
  }

  /**
   * Executes the complete checkout flow (dates -> confirm -> success).
   *
   * @param startDaysFromNow - Days from now for start date.
   * @param endDaysFromNow - Days from now for end date.
   * @returns A promise that resolves when the flow is complete.
   */
  async completeCheckout(startDaysFromNow: number, endDaysFromNow: number): Promise<void> {
    await this.setDatesFromNow(startDaysFromNow, endDaysFromNow);
    await this.proceedToConfirmation();
    await this.confirm();
    await this.waitForSuccess();
  }
}
