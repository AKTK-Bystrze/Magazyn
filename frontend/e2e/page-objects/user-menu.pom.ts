import type { Page, Locator } from '@playwright/test';

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
   * Opens the user menu dropdown
   * Waits for dropdown to be visible before returning
   */
  async open(): Promise<void> {
    await this.trigger.click();
    
    // Wait for logout button to be visible (confirms dropdown is open)
    // Radix UI renders dropdown in portal, so we check for content visibility
    await this.logoutButton.waitFor({ state: 'visible', timeout: 5000 });
  }

  /**
   * Clicks the logout button
   * Assumes menu is already open
   */
  async clickLogout(): Promise<void> {
    await this.logoutButton.click();
  }

  /**
   * Complete logout flow: open menu and click logout
   */
  async logout(): Promise<void> {
    await this.open();
    await this.clickLogout();
  }

  /**
   * Logout and wait for navigation to complete
   * Use this when you need to ensure redirect has started
   */
  async logoutAndWaitForRedirect(): Promise<void> {
    await this.open();
    
    // Wait for navigation to start after clicking logout
    const navigationPromise = this.page.waitForURL(/\/login/, { timeout: 15000 });
    await this.clickLogout();
    await navigationPromise;
  }

  /**
   * Checks if the logout button contains expected text
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
   * Verifies user menu trigger is visible
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
