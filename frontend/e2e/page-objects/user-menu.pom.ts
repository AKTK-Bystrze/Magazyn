import type { Page, Locator } from '@playwright/test';
import { E2E_CONFIG } from '../constants';

/**
 * Page Object Model for UserMenu component
 * 
 * Encapsulates user menu interactions with proper waiting strategies
 * for Radix UI portal-based dropdown menus.
 * 
 * @example
 * const userMenu = new UserMenuPOM(page);
 * await userMenu.open();
 * await userMenu.logout();
 */
export class UserMenuPOM {
  private readonly page: Page;
  private readonly trigger: Locator;
  private readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.trigger = page.getByTestId('user-menu-trigger');
    this.logoutButton = page.getByTestId('logout-button');
  }

  /**
   * Opens the user menu dropdown by clicking the trigger.
   * Waits for the logout button to become visible to confirm the menu is open.
   *
   * @returns A promise that resolves when the menu is fully open.
   */
  async open(): Promise<void> {
    await this.trigger.click();
    await this.logoutButton.waitFor({ state: 'visible', timeout: E2E_CONFIG.TIMEOUT.ASSERTION });
  }

  /**
   * Clicks the logout button in the user menu.
   * Assumes the menu is already open.
   *
   * @returns A promise that resolves when the button is clicked.
   */
  async clickLogout(): Promise<void> {
    await this.logoutButton.click();
  }

  /**
   * Performs the complete logout flow: opens the menu and clicks logout.
   *
   * @returns A promise that resolves when the logout action is triggered.
   */
  async logout(): Promise<void> {
    await this.open();
    await this.clickLogout();
  }

  /**
   * Performs logout and explicitly waits for the redirect to the login page.
   * useful for verifying the full logout lifecycle.
   *
   * @returns A promise that resolves when the page has redirected to /login.
   */
  async logoutAndWaitForRedirect(): Promise<void> {
    await this.open();
    
    const navigationPromise = this.page.waitForURL(/\/login/, { timeout: E2E_CONFIG.TIMEOUT.NAVIGATION });
    await this.clickLogout();
    await navigationPromise;
  }

  /**
   * Checks if the logout button contains strict text content.
   *
   * @param text - The text string to look for within the logout button.
   * @returns A promise that resolves to true if the text is found, false otherwise.
   */
  async hasLogoutButtonWithText(text: string): Promise<boolean> {
    try {
      const content = await this.logoutButton.textContent();
      return content?.includes(text) ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Verifies that the user menu trigger button is visible on the page.
   *
   * @returns A promise that resolves to true if visible, false otherwise.
   */
  async isVisible(): Promise<boolean> {
    try {
      await this.trigger.waitFor({ state: 'visible', timeout: 1000 });
      return true;
    } catch {
      return false;
    }
  }
}
