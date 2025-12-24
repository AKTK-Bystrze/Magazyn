import type { SupabaseClient } from '@supabase/supabase-js';
import { E2E_CONFIG } from '../constants';

/**
 * Resets a user's credit balance to the default or specified amount.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param userId - The ID of the user.
 * @param balance - The credit balance to set (default: defined in config).
 * @returns A promise that resolves when the balance is updated.
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
 * Cancels a reservation by setting its status to 'DENIED'.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param reservationId - The ID of the reservation to cancel.
 * @returns A promise that resolves when the status is updated.
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
 * Clears all pending reservations for a specified user.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param userId - The ID of the user.
 * @returns A promise that resolves when all pending reservations are denied.
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
 * Creates test equipment items for a specific worker.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param workerIndex - The index of the worker executing the test.
 * @param count - The number of equipment items to create (default: defined in config).
 * @returns A promise that resolves to an array of created equipment objects (id, typeId, name).
 * @throws An error if equipment types cannot be fetched or creation fails.
 */
export async function createTestEquipment(
  supabaseAdmin: SupabaseClient,
  workerIndex: number,
  count: number = E2E_CONFIG.DEFAULTS.DEFAULT_EQUIPMENT_COUNT
): Promise<{ id: string; typeId: string; name: string }[]> {
  const { data: typeData, error: typeError } = await supabaseAdmin
    .from('equipment_types')
    .select('id')
    .limit(1)
    .single();

  if (typeError || !typeData) {
    throw new Error(`Failed to get equipment type: ${typeError?.message}`);
  }

  const equipmentItems: { id: string; typeId: string; name: string }[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const uniqueId = `${E2E_CONFIG.TEST_EQUIPMENT_PREFIX}W${workerIndex}-${i}-${timestamp}`;
    const equipmentName = `E2E-W${workerIndex}-${timestamp.toString().slice(-6)}-${i}`;

    const { data, error } = await supabaseAdmin
      .from('equipment')
      .insert({
        internal_id: uniqueId,
        type_id: typeData.id,
        name: equipmentName,
        status: 'ok',
      })
      .select('id')
      .single();

    if (error || !data) {
      throw new Error(`Failed to create test equipment: ${error?.message}`);
    }

    equipmentItems.push({ id: data.id, typeId: typeData.id, name: equipmentName });
  }

  return equipmentItems;
}

/**
 * Deletes test equipment and associated reservations.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param equipmentIds - An array of equipment IDs to delete.
 * @returns A promise that resolves when the equipment and related data are deleted.
 */
export async function cleanupTestEquipment(
  supabaseAdmin: SupabaseClient,
  equipmentIds: string[]
): Promise<void> {
  if (equipmentIds.length === 0) return;

  if (equipmentIds.length === 0) return;

  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .in('equipment_id', equipmentIds);

  const reservationIds = reservations?.map(r => r.id) ?? [];

  if (reservationIds.length > 0) {
    const { error: historyError } = await supabaseAdmin
      .from('reservation_history')
      .delete()
      .in('reservation_id', reservationIds);

    if (historyError) {
      console.error(`Failed to cleanup reservation history: ${historyError.message}`);
    }

    const { error: creditError } = await supabaseAdmin
      .from('credit_history')
      .delete()
      .in('reservation_id', reservationIds);

    if (creditError) {
      console.error(`Failed to cleanup credit history: ${creditError.message}`);
    }
  }

  const { error: resError } = await supabaseAdmin
    .from('reservations')
    .delete()
    .in('equipment_id', equipmentIds);

  if (resError) {
    console.error(`Failed to cleanup reservations: ${resError.message}`);
  }

  const { error } = await supabaseAdmin
    .from('equipment')
    .delete()
    .in('id', equipmentIds);

  if (error) {
    console.error(`Failed to cleanup test equipment: ${error.message}`);
  }
}

/**
 * Cleans up orphaned test equipment from previous test runs.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @returns A promise that resolves to the number of deleted equipment items.
 */
export async function cleanupOrphanedTestEquipment(
  supabaseAdmin: SupabaseClient
): Promise<number> {
  const { data: equipment, error: fetchError } = await supabaseAdmin
    .from('equipment')
    .select('id, internal_id')
    .like('internal_id', `${E2E_CONFIG.TEST_EQUIPMENT_PREFIX}%`);

  if (fetchError) {
    console.error(`Failed to fetch orphaned equipment: ${fetchError.message}`);
    return 0;
  }

  if (!equipment || equipment.length === 0) {
    return 0;
  }

  const equipmentIds = equipment.map(e => e.id);

  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .in('equipment_id', equipmentIds);

  const reservationIds = reservations?.map(r => r.id) ?? [];

  if (reservationIds.length > 0) {
    const { error: historyError } = await supabaseAdmin
      .from('reservation_history')
      .delete()
      .in('reservation_id', reservationIds);

    if (historyError) {
      console.error(`Failed to delete orphaned reservation history: ${historyError.message}`);
    }

    const { error: creditError } = await supabaseAdmin
      .from('credit_history')
      .delete()
      .in('reservation_id', reservationIds);

    if (creditError) {
      console.error(`Failed to delete orphaned credit history: ${creditError.message}`);
    }
  }

  const { error: resError } = await supabaseAdmin
    .from('reservations')
    .delete()
    .in('equipment_id', equipmentIds);

  if (resError) {
    console.error(`Failed to delete orphaned reservations: ${resError.message}`);
  }

  const { error: deleteError } = await supabaseAdmin
    .from('equipment')
    .delete()
    .in('id', equipmentIds);

  if (deleteError) {
    console.error(`Failed to delete orphaned equipment: ${deleteError.message}`);
    return 0;
  }

  return equipment.length;
}

/**
 * Hard-deletes a single equipment item and all related data.
 * Used for E2E test cleanup after equipment manager tests.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param equipmentId - The ID of the equipment to delete.
 * @returns A promise that resolves when deletion is complete.
 */
export async function hardDeleteEquipment(
  supabaseAdmin: SupabaseClient,
  equipmentId: string
): Promise<void> {
  const { data: reservations } = await supabaseAdmin
    .from('reservations')
    .select('id')
    .eq('equipment_id', equipmentId);

  const reservationIds = reservations?.map(r => r.id) ?? [];

  if (reservationIds.length > 0) {
    const { error: historyError } = await supabaseAdmin
      .from('reservation_history')
      .delete()
      .in('reservation_id', reservationIds);

    if (historyError) {
      console.error(`Failed to cleanup reservation history: ${historyError.message}`);
    }

    const { error: creditError } = await supabaseAdmin
      .from('credit_history')
      .delete()
      .in('reservation_id', reservationIds);

    if (creditError) {
      console.error(`Failed to cleanup credit history: ${creditError.message}`);
    }
  }

  const { error: resError } = await supabaseAdmin
    .from('reservations')
    .delete()
    .eq('equipment_id', equipmentId);

  if (resError) {
    console.error(`Failed to cleanup reservations: ${resError.message}`);
  }

  const { error } = await supabaseAdmin
    .from('equipment')
    .delete()
    .eq('id', equipmentId);

  if (error) {
    console.error(`Failed to cleanup equipment: ${error.message}`);
  }
}
