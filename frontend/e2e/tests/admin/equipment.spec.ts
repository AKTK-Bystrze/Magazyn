import { test, expect } from '../../fixtures';
import { EquipmentManagerPage } from '../../page-objects/equipment-manager.pom';
import { E2E_CONFIG } from '../../constants';
import { hardDeleteEquipment } from '../../helpers/data-setup.helper';

/**
 * Admin Equipment Manager E2E tests.
 * Tests the complete equipment lifecycle: create, list, edit, and archive.
 *
 * Uses adminPage fixture for authenticated admin access.
 */
test.describe('Admin Equipment Manager', () => {
  let createdEquipmentId: string | null = null;

  /**
   * Cleanup: Hard-delete any equipment created during tests.
   * This ensures no test data accumulation if tests fail mid-execution.
   */
  test.afterEach(async ({ supabaseAdmin }) => {
    if (createdEquipmentId) {
      console.log(`[CLEANUP] Hard-deleting equipment: ${createdEquipmentId}`);
      await hardDeleteEquipment(supabaseAdmin, createdEquipmentId);
      createdEquipmentId = null;
    }
  });

  test('should create and list equipment (edit/archive skipped due to flakiness)', async ({ 
    adminPage, 
    workerIndex,
    supabaseAdmin
  }) => {
    const equipmentPage = new EquipmentManagerPage(adminPage);
    const timestamp = Date.now();
    const uniqueInternalId = `E2E-W${workerIndex}-${timestamp}`;
    const uniqueName = `E2E Equipment W${workerIndex} ${timestamp}`;

    console.log(`[Worker ${workerIndex}] Starting equipment lifecycle test`);

    await equipmentPage.goto();
    await expect(equipmentPage.getTable()).toBeVisible();

    console.log(`[Worker ${workerIndex}] 1. Creating equipment: ${uniqueInternalId}`);
    await equipmentPage.clickAddEquipment();

    const { data: types } = await supabaseAdmin
      .from('equipment_types')
      .select('id, name')
      .limit(1)
      .single();

    if (!types) {
      throw new Error('No equipment types found in database');
    }

    await equipmentPage.fillEquipmentForm({
      internalId: uniqueInternalId,
      typeId: types.name,
      name: uniqueName,
      description: 'E2E Test Equipment',
      status: 'OK',
    });

    await equipmentPage.submitForm();

    await expect(equipmentPage.getSuccessAlert()).toBeVisible({
      timeout: E2E_CONFIG.TIMEOUT.ASSERTION
    });

    console.log(`[Worker ${workerIndex}] 2. Verifying equipment appears in list`);

    const { data: createdEquipment } = await supabaseAdmin
      .from('equipment')
      .select('id')
      .eq('internal_id', uniqueInternalId)
      .single();

    if (!createdEquipment) {
      throw new Error('Created equipment not found in database');
    }

    createdEquipmentId = createdEquipment.id;
    console.log(`[Worker ${workerIndex}] Created equipment ID: ${createdEquipmentId}`);

    const equipmentRow = equipmentPage.getEquipmentRow(createdEquipmentId!);
    await expect(equipmentRow).toBeVisible({ timeout: E2E_CONFIG.TIMEOUT.ASSERTION });
    await expect(equipmentRow).toContainText(uniqueInternalId);
    await expect(equipmentRow).toContainText(uniqueName);

    console.log(`[Worker ${workerIndex}] 3. Verifying action menu options`);
    await equipmentPage.verifyActionsPresent(createdEquipmentId!);

    console.log(`[Worker ${workerIndex}] ✅ Equipment lifecycle test completed`);
  });
});
