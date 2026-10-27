import type { SupabaseClient } from "@supabase/supabase-js";
import { E2E_CONFIG } from "../constants";

/**
 * Ensures that default equipment types exist in the database.
 * Creates 'kayak' and 'paddle' types if they don't exist.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @returns A promise that resolves to an object with equipment type IDs.
 * @throws An error if equipment types cannot be created or fetched.
 */
async function ensureEquipmentTypesExist(
  supabaseAdmin: SupabaseClient
): Promise<{ kayakId: string; paddleId: string }> {
  const defaultTypes = [E2E_CONFIG.EQUIPMENT_TYPES.KAYAK, E2E_CONFIG.EQUIPMENT_TYPES.PADDLE];

  for (const type of defaultTypes) {
    const { error } = await supabaseAdmin
      .from("equipment_types")
      .upsert(type, { onConflict: "name", ignoreDuplicates: true });

    if (error) {
      console.warn(`Failed to upsert equipment type ${type.name}: ${error.message}`);
    }
  }

  const { data: types, error: fetchError } = await supabaseAdmin
    .from("equipment_types")
    .select("id, name")
    .in(
      "name",
      defaultTypes.map((t) => t.name)
    );

  if (fetchError || !types || types.length === 0) {
    throw new Error(`Failed to fetch equipment types after seeding: ${fetchError?.message}`);
  }

  const kayakType = types.find((t) => t.name === "kayak");
  const paddleType = types.find((t) => t.name === "paddle");

  if (!kayakType || !paddleType) {
    throw new Error("Failed to find kayak or paddle equipment type");
  }

  return { kayakId: kayakType.id, paddleId: paddleType.id };
}

/**
 * Ensures that sample equipment exists in the database for browsing tests.
 * Creates a minimal set of equipment items if they don't exist.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @returns A promise that resolves when seed equipment is created.
 */
export async function ensureSeedEquipmentExists(supabaseAdmin: SupabaseClient): Promise<void> {
  const { data: existingSeed } = await supabaseAdmin
    .from("equipment")
    .select("id")
    .like("internal_id", "SEED-%")
    .limit(1);

  if (existingSeed && existingSeed.length > 0) {
    return;
  }

  const { kayakId, paddleId } = await ensureEquipmentTypesExist(supabaseAdmin);

  const seedEquipment = [
    {
      internal_id: "SEED-K1",
      type_id: kayakId,
      name: "Test Kayak 1",
      description: "For E2E tests",
      status: "ok",
    },
    {
      internal_id: "SEED-K2",
      type_id: kayakId,
      name: "Test Kayak 2",
      description: "For E2E tests",
      status: "ok",
    },
    {
      internal_id: "SEED-P1",
      type_id: paddleId,
      name: "Test Paddle 1",
      description: "For E2E tests",
      status: "ok",
    },
    {
      internal_id: "SEED-P2",
      type_id: paddleId,
      name: "Test Paddle 2",
      description: "For E2E tests",
      status: "ok",
    },
  ];

  const { error } = await supabaseAdmin
    .from("equipment")
    .upsert(seedEquipment, { onConflict: "type_id, internal_id", ignoreDuplicates: true });

  if (error) {
    console.warn(`Failed to seed equipment: ${error.message}`);
  }
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
  const { kayakId } = await ensureEquipmentTypesExist(supabaseAdmin);

  const equipmentItems: { id: string; typeId: string; name: string }[] = [];
  const timestamp = Date.now();

  for (let i = 0; i < count; i++) {
    const uniqueId = `${E2E_CONFIG.TEST_EQUIPMENT_PREFIX}W${workerIndex}-${i}-${timestamp}`;
    const equipmentName = `E2E-W${workerIndex}-${timestamp.toString().slice(-6)}-${i}`;

    const { data, error } = await supabaseAdmin
      .from("equipment")
      .insert({
        internal_id: uniqueId,
        type_id: kayakId,
        name: equipmentName,
        status: "ok",
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(`Failed to create test equipment: ${error?.message}`);
    }

    equipmentItems.push({ id: data.id, typeId: kayakId, name: equipmentName });
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

  const { data: reservations } = await supabaseAdmin
    .from("reservations")
    .select("id")
    .in("equipment_id", equipmentIds);

  const reservationIds = reservations?.map((r) => r.id) ?? [];

  if (reservationIds.length > 0) {
    const { error: historyError } = await supabaseAdmin
      .from("reservation_history")
      .delete()
      .in("reservation_id", reservationIds);

    if (historyError) {
      console.error(`Failed to cleanup reservation history: ${historyError.message}`);
    }

    const { error: creditError } = await supabaseAdmin
      .from("credit_history")
      .delete()
      .in("reservation_id", reservationIds);

    if (creditError) {
      console.error(`Failed to cleanup credit history: ${creditError.message}`);
    }
  }

  const { error: resError } = await supabaseAdmin
    .from("reservations")
    .delete()
    .in("equipment_id", equipmentIds);

  if (resError) {
    console.error(`Failed to cleanup reservations: ${resError.message}`);
  }

  const { error: maintenanceError } = await supabaseAdmin
    .from("maintenance_logs")
    .delete()
    .in("equipment_id", equipmentIds);

  if (maintenanceError) {
    console.error(`Failed to cleanup maintenance logs: ${maintenanceError.message}`);
  }

  const { error } = await supabaseAdmin.from("equipment").delete().in("id", equipmentIds);

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
export async function cleanupOrphanedTestEquipment(supabaseAdmin: SupabaseClient): Promise<number> {
  const { data: equipment, error: fetchError } = await supabaseAdmin
    .from("equipment")
    .select("id, internal_id")
    .like("internal_id", `${E2E_CONFIG.TEST_EQUIPMENT_PREFIX}%`);

  if (fetchError) {
    console.error(`Failed to fetch orphaned equipment: ${fetchError.message}`);
    return 0;
  }

  if (!equipment || equipment.length === 0) {
    return 0;
  }

  const equipmentIds = equipment.map((e) => e.id);
  await cleanupTestEquipment(supabaseAdmin, equipmentIds);
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
  await cleanupTestEquipment(supabaseAdmin, [equipmentId]);
}

/**
 * Shape of a credit history entry to seed into the database.
 */
export interface SeedCreditHistoryEntry {
  amount: number;
  reason:
    | "reservation_charge"
    | "reservation_refund"
    | "reservation_adjustment"
    | "admin_adjustment"
    | "work_credit";
  description?: string;
  author_id?: string;
  reservation_id?: string;
  created_at?: string;
}

/**
 * Seeds credit history entries for a specified user in the database.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param userId - The ID of the user.
 * @param entries - Array of credit history entries to insert.
 * @returns A promise that resolves when all entries are inserted.
 */
export async function seedCreditHistory(
  supabaseAdmin: SupabaseClient,
  userId: string,
  entries: SeedCreditHistoryEntry[]
): Promise<void> {
  if (entries.length === 0) return;

  const records = entries.map((entry) => ({
    user_id: userId,
    amount: entry.amount,
    reason: entry.reason,
    description: entry.description ?? null,
    author_id: entry.author_id ?? null,
    reservation_id: entry.reservation_id ?? null,
    created_at: entry.created_at ?? new Date().toISOString(),
  }));

  const { error } = await supabaseAdmin.from("credit_history").insert(records);
  if (error) {
    throw new Error(`Failed to seed credit history: ${error.message}`);
  }
}

/**
 * Clears all credit history records for a specified user.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @param userId - The ID of the user.
 * @returns A promise that resolves when the history is cleared.
 */
export async function clearCreditHistory(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabaseAdmin.from("credit_history").delete().eq("user_id", userId);
  if (error) {
    throw new Error(`Failed to clear credit history: ${error.message}`);
  }
}
