import type { SupabaseClient } from '@supabase/supabase-js';
import { E2E_CONFIG } from '../constants';

/**
 * Reset user credits to default balance.
 */
export async function resetCredits(
  supabaseAdmin: SupabaseClient,
  userId: string,
  balance = E2E_CONFIG.DEFAULTS.CREDIT_BALANCE
): Promise<void> {
  await supabaseAdmin
    .from('profiles')
    .update({ credit_balance: balance })
    .eq('id', userId);
}

/**
 * Cancel a reservation and optionally refund credits.
 */
export async function cancelReservation(
  supabaseAdmin: SupabaseClient,
  reservationId: string
): Promise<void> {
  await supabaseAdmin
    .from('reservations')
    .update({ status: 'DENIED' })
    .eq('id', reservationId);
}

/**
 * Clear all pending reservations for a user (test cleanup).
 *
 * @param supabaseAdmin - Supabase client with admin privileges
 * @param userId - User ID to clear reservations for
 */
export async function clearPendingReservations(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  await supabaseAdmin
    .from('reservations')
    .update({ status: 'DENIED' })
    .eq('user_id', userId)
    .eq('status', 'PENDING');
}

/**
 * Creates test equipment for a worker.
 * Uses the first available equipment type from the database.
 *
 * @param supabaseAdmin - Supabase client with admin privileges
 * @param workerIndex - Worker index for unique naming
 * @param count - Number of equipment items to create
 * @returns Array of created equipment with id and typeId
 * @throws Error if equipment type lookup or creation fails
 */
export async function createTestEquipment(
  supabaseAdmin: SupabaseClient,
  workerIndex: number,
  count: number = 2
): Promise<{ id: string; typeId: string }[]> {
  // Get first available equipment type
  const { data: typeData, error: typeError } = await supabaseAdmin
    .from('equipment_types')
    .select('id')
    .limit(1)
    .single();

  if (typeError || !typeData) {
    throw new Error(`Failed to get equipment type: ${typeError?.message}`);
  }

  const equipmentItems: { id: string; typeId: string }[] = [];

  for (let i = 0; i < count; i++) {
    const uniqueId = `${E2E_CONFIG.TEST_EQUIPMENT_PREFIX}W${workerIndex}-${i}-${Date.now()}`;

    const { data, error } = await supabaseAdmin
      .from('equipment')
      .insert({
        internal_id: uniqueId,
        type_id: typeData.id,
        name: `Test Equipment W${workerIndex}-${i}`,
        status: 'ok',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create test equipment: ${error?.message}`);
    }

    equipmentItems.push({ id: data.id, typeId: typeData.id });
  }

  console.log(`[Worker ${workerIndex}] ✅ Created ${count} test equipment items`);
  return equipmentItems;
}

/**
 * Deletes test equipment created for a worker.
 * Silently continues on error to allow cleanup of other resources.
 *
 * @param supabaseAdmin - Supabase client with admin privileges
 * @param equipmentIds - Array of equipment IDs to delete
 */
export async function cleanupTestEquipment(
  supabaseAdmin: SupabaseClient,
  equipmentIds: string[]
): Promise<void> {
  if (equipmentIds.length === 0) return;

  // First get reservation IDs for these equipment items
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .in('equipment_id', equipmentIds);

  const reservationIds = reservations?.map(r => r.id) ?? [];

  // Delete reservation_history first (child of reservations)
  if (reservationIds.length > 0) {
    const { error: historyError } = await supabaseAdmin
      .from('reservation_history')
      .delete()
      .in('reservation_id', reservationIds);

    if (historyError) {
      console.error(`Failed to cleanup reservation history: ${historyError.message}`);
    }
  }

  // Then delete reservations (child of equipment)
  const { error: resError } = await supabaseAdmin
    .from('reservations')
    .delete()
    .in('equipment_id', equipmentIds);

  if (resError) {
    console.error(`Failed to cleanup reservations: ${resError.message}`);
  }

  // Finally delete the equipment (parent)
  const { error } = await supabaseAdmin
    .from('equipment')
    .delete()
    .in('id', equipmentIds);

  if (error) {
    console.error(`Failed to cleanup test equipment: ${error.message}`);
  }
}

/**
 * Cleans up orphaned test equipment from previous failed test runs.
 * Removes all equipment with internal_id starting with TEST_EQUIPMENT_PREFIX.
 *
 * @param supabaseAdmin - Supabase client with admin privileges
 * @returns Number of equipment items deleted
 */
export async function cleanupOrphanedTestEquipment(
  supabaseAdmin: SupabaseClient
): Promise<number> {
  console.log('[CLEANUP] Searching for orphaned test equipment...');

  // Find all test equipment
  const { data: equipment, error: fetchError } = await supabaseAdmin
    .from('equipment')
    .select('id, internal_id')
    .like('internal_id', `${E2E_CONFIG.TEST_EQUIPMENT_PREFIX}%`);

  if (fetchError) {
    console.error(`Failed to fetch orphaned equipment: ${fetchError.message}`);
    return 0;
  }

  if (!equipment || equipment.length === 0) {
    console.log('[CLEANUP] ✅ No orphaned test equipment found');
    return 0;
  }

  const equipmentIds = equipment.map(e => e.id);

  // Get reservation IDs first
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .in('equipment_id', equipmentIds);

  const reservationIds = reservations?.map(r => r.id) ?? [];

  // Delete reservation_history first (child of reservations)
  if (reservationIds.length > 0) {
    const { error: historyError } = await supabaseAdmin
      .from('reservation_history')
      .delete()
      .in('reservation_id', reservationIds);

    if (historyError) {
      console.error(`Failed to delete orphaned reservation history: ${historyError.message}`);
    }
  }

  // Delete reservations (child of equipment)
  const { error: resError } = await supabaseAdmin
    .from('reservations')
    .delete()
    .in('equipment_id', equipmentIds);

  if (resError) {
    console.error(`Failed to delete orphaned reservations: ${resError.message}`);
  }

  // Delete equipment (parent)
  const { error: deleteError } = await supabaseAdmin
    .from('equipment')
    .delete()
    .in('id', equipmentIds);

  if (deleteError) {
    console.error(`Failed to delete orphaned equipment: ${deleteError.message}`);
    return 0;
  }

  console.log(`[CLEANUP] ✅ Deleted ${equipment.length} orphaned test equipment items`);
  return equipment.length;
}
