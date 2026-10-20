import { test, expect } from "../../fixtures";

test.describe("Reservation Filtering and Sorting E2E", () => {
  test("Filters reservations toolbar is visible and interactive", async ({ adminPage }) => {
    test.setTimeout(60000);

    await adminPage.goto("/admin/reservations");
    await adminPage.waitForFunction(() => !document.querySelector("astro-island[ssr]"));

    const filtersContainer = adminPage.getByTestId("reservation-filters");
    await expect(filtersContainer).toBeVisible({ timeout: 15000 });
    await expect(adminPage.getByLabel("Użytkownik")).toBeVisible({ timeout: 15000 });

    const searchInput = adminPage.getByTestId("reservation-search-input");
    await expect(searchInput).toBeVisible();

    await searchInput.fill("NonExistentEquipmentXYZ123");
    await expect(searchInput).toHaveValue("NonExistentEquipmentXYZ123");
    await searchInput.press("Enter");

    const resetButton = adminPage.getByTestId("reset-filters-button");
    await expect(resetButton).toBeVisible({ timeout: 10000 });

    await resetButton.click();
    await expect(searchInput).toHaveValue("");
    await expect(resetButton).not.toBeVisible();
  });

  test("User filter is displayed when viewing all reservations", async ({ adminPage }) => {
    test.setTimeout(60000);

    await adminPage.goto("/admin/reservations");

    const filtersContainer = adminPage.getByTestId("reservation-filters");
    await expect(filtersContainer).toBeVisible({ timeout: 15000 });

    const userTrigger = adminPage.locator("#user-filter");
    await expect(userTrigger).toBeVisible({ timeout: 15000 });
    await expect(userTrigger).toContainText(/Wszyscy użytkownicy/i);
  });

  test("Status and Sort dropdowns are present with expected options", async ({ adminPage }) => {
    test.setTimeout(60000);

    await adminPage.goto("/admin/reservations");

    const filtersContainer = adminPage.getByTestId("reservation-filters");
    await expect(filtersContainer).toBeVisible({ timeout: 15000 });

    const statusTrigger = adminPage.locator("#status-filter");
    await expect(statusTrigger).toBeVisible({ timeout: 15000 });
    await expect(statusTrigger).toContainText(/Wszystkie statusy/i);

    const sortTrigger = adminPage.locator("#sort-filter");
    await expect(sortTrigger).toBeVisible({ timeout: 15000 });
    await expect(sortTrigger).toContainText(/Sortuj według|Data utworzenia/i);
  });
});
