import { test, expect } from "../../fixtures";
import { EquipmentManagerPage } from "../../page-objects/equipment-manager.pom";
import { E2E_CONFIG, TEST_IDS } from "../../constants";
import { hardDeleteEquipment } from "../../helpers/data-setup.helper";

test.describe("Admin Equipment Manager", () => {
  let createdEquipmentId: string | null = null;

  test.afterEach(async ({ supabaseAdmin }) => {
    if (createdEquipmentId) {
      console.log(`[CLEANUP] Hard-deleting equipment: ${createdEquipmentId}`);
      await hardDeleteEquipment(supabaseAdmin, createdEquipmentId);
      createdEquipmentId = null;
    }
  });

  test("should execute complete equipment CRUD lifecycle via UI", async ({
    adminPage,
    workerIndex,
    supabaseAdmin,
  }) => {
    const equipmentPage = new EquipmentManagerPage(adminPage);
    const timestamp = Date.now();
    const uniqueInternalId = `E2E-W${workerIndex}-${timestamp}`;
    const uniqueName = `E2E Equipment W${workerIndex} ${timestamp}`;
    const updatedName = `${uniqueName} Updated`;

    console.log(`[Worker ${workerIndex}] Starting equipment lifecycle test`);

    await equipmentPage.goto();
    await expect(equipmentPage.getTable()).toBeVisible();

    console.log(`[Worker ${workerIndex}] 1. Creating equipment via UI: ${uniqueInternalId}`);
    await equipmentPage.clickAddEquipment();
    await expect(equipmentPage.getAddDialog()).toBeVisible();

    const { data: types } = await supabaseAdmin
      .from("equipment_types")
      .select("id, name")
      .limit(1)
      .single();

    if (!types) {
      throw new Error("No equipment types found in database");
    }

    await equipmentPage.fillEquipmentForm({
      internalId: uniqueInternalId,
      typeId: types.name,
      name: uniqueName,
      description: "E2E Test Equipment",
      status: "OK",
    });

    await equipmentPage.submitForm();

    await expect(equipmentPage.getSuccessAlert()).toBeVisible({
      timeout: E2E_CONFIG.TIMEOUT.ASSERTION,
    });

    console.log(`[Worker ${workerIndex}] 2. Verifying created equipment appears in table`);

    const { data: createdEquipment } = await supabaseAdmin
      .from("equipment")
      .select("id")
      .eq("internal_id", uniqueInternalId)
      .single();

    if (!createdEquipment) {
      throw new Error("Created equipment not found in database");
    }

    const equipmentId = createdEquipment.id;
    createdEquipmentId = equipmentId;
    console.log(`[Worker ${workerIndex}] Created equipment ID: ${equipmentId}`);

    const equipmentRow = equipmentPage.getEquipmentRow(equipmentId);
    await expect(equipmentRow).toBeVisible({ timeout: E2E_CONFIG.TIMEOUT.ASSERTION });
    await expect(equipmentRow).toContainText(uniqueInternalId);
    await expect(equipmentRow).toContainText(uniqueName);
    await expect(equipmentRow).toContainText("OK");

    console.log(`[Worker ${workerIndex}] 3. Editing equipment name and status via UI dialog`);
    await equipmentPage.clickEdit(equipmentId);
    const editDialog = adminPage.getByTestId("admin-edit-equipment-dialog");
    await expect(editDialog).toBeVisible();

    await editDialog.getByTestId(TEST_IDS.EQUIPMENT_FORM_NAME_INPUT).fill(updatedName);
    await editDialog.getByTestId(TEST_IDS.EQUIPMENT_FORM_STATUS_SELECT).click();
    await adminPage
      .getByRole("option", { name: /Zablokowane/i })
      .first()
      .click();
    await equipmentPage.submitForm();

    await expect(equipmentPage.getSuccessAlert()).toBeVisible({
      timeout: E2E_CONFIG.TIMEOUT.ASSERTION,
    });

    await expect(equipmentRow).toContainText(updatedName);
    await expect(equipmentRow).toContainText("Zablokowane");

    const { data: dbEdited, error: editError } = await supabaseAdmin
      .from("equipment")
      .select("name, status")
      .eq("id", equipmentId)
      .single();
    expect(editError).toBeNull();
    expect(dbEdited).toMatchObject({ name: updatedName, status: "blocked" });

    console.log(`[Worker ${workerIndex}] 4. Archiving equipment via UI dialog`);
    await equipmentPage.clickArchive(equipmentId);
    await expect(equipmentPage.getArchiveDialog()).toBeVisible();

    await equipmentPage.confirmArchive();

    await expect(equipmentPage.getSuccessAlert()).toBeVisible({
      timeout: E2E_CONFIG.TIMEOUT.ASSERTION,
    });

    await expect(equipmentPage.getEquipmentRow(equipmentId)).toBeHidden({
      timeout: E2E_CONFIG.TIMEOUT.ASSERTION,
    });

    const { data: dbArchived, error: archiveError } = await supabaseAdmin
      .from("equipment")
      .select("is_archived")
      .eq("id", equipmentId)
      .single();
    expect(archiveError).toBeNull();
    expect(dbArchived?.is_archived).toBe(true);

    console.log(`[Worker ${workerIndex}] ✅ Equipment lifecycle test completed`);
  });
});
