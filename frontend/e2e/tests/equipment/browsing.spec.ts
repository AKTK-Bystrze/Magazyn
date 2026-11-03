import { test, expect } from "../../fixtures";
import { TEST_IDS } from "../../constants";

test.describe("Equipment Browsing", () => {
  test("should open equipment details on click", async ({ authenticatedPage }) => {
    await authenticatedPage.goto("/equipment");

    await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();

    const firstCard = authenticatedPage.locator('[data-testid^="equipment-card-"]').first();
    await expect(firstCard).toBeVisible();

    const cardTestId = await firstCard.getAttribute("data-testid");
    expect(cardTestId).not.toBeNull();
    const equipmentId = cardTestId!.replace("equipment-card-", "");

    const detailsButton = authenticatedPage.getByTestId(
      TEST_IDS.equipmentDetailsButton(equipmentId)
    );
    await detailsButton.click();

    const detailsSheet = authenticatedPage.getByTestId("equipment-details-sheet");
    await expect(detailsSheet).toBeVisible();
  });
});
