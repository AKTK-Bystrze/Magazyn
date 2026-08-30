import {
  createSupabaseAdmin,
  ensureTestUserExists,
  ensureAdminUserExists,
  ensureSuperAdminUserExists,
} from "./fixtures/index";

async function globalSetup() {
  console.log("\n[GLOBAL SETUP] Provisioning E2E users...\n");
  const supabaseAdmin = createSupabaseAdmin();

  try {
    await ensureTestUserExists(supabaseAdmin, 0);
    await ensureAdminUserExists(supabaseAdmin, 0);
    await ensureSuperAdminUserExists(supabaseAdmin, 0);
    console.log("\n[GLOBAL SETUP] ✅ User provisioning complete\n");
  } catch (error) {
    console.error("[GLOBAL SETUP] ❌ User provisioning failed:", error);
    throw error;
  }
}

export default globalSetup;
