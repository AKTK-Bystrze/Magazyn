import { test as base, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  createTestEquipment,
  cleanupTestEquipment,
  ensureSeedEquipmentExists,
  clearPendingReservations,
} from "../helpers/data-setup.helper";
import { E2E_CONFIG } from "../constants";

/**
 * E2E Test Fixtures with Automated Authentication
 * ...
 */

/** Test-scoped fixtures (created per test) */
interface AuthFixtures {
  /** Pre-authenticated page with test user session */
  authenticatedPage: Page;
  /** Pre-authenticated page with ADMIN session */
  adminPage: Page;
  /** Pre-authenticated page with SUPER ADMIN session */
  superAdminPage: Page;
  /** Supabase admin client for test setup/teardown */
  supabaseAdmin: SupabaseClient;
  /** Test user information (id and email) */
  testUser: { id: string; email: string };
  /** Admin user information (id and email) */
  adminUser: { id: string; email: string };
  /** Super Admin user information (id and email) */
  superAdminUser: { id: string; email: string };
  /** Dedicated test equipment for this worker (created/cleaned per test) */
  testEquipment: { id: string; typeId: string; name: string }[];
  /** Worker-scoped cleanup fixture (no return value) */
  userCleanup: void;
}

/** Worker-scoped fixtures (shared across tests in same worker) */
interface WorkerFixtures {
  /** Worker index for parallel test isolation */
  workerIndex: number;
}

export function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Ensure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function ensureUserExists(
  supabaseAdmin: SupabaseClient,
  workerIndex: number,
  role: string,
  emailGetter: (idx: number) => string,
  logPrefix: string,
  nameSuffix: string
): Promise<{ id: string; email: string }> {
  const email = emailGetter(workerIndex);
  console.log(`[SETUP] Checking if ${logPrefix} exists:`, email);

  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const users = data?.users ?? [];
  const existingUser = users.find((u) => u.email === email);
  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    const isConfirmed = !!existingUser.email_confirmed_at;
    const hasRole = existingUser.user_metadata?.role === role;

    if (isConfirmed && hasRole) {
      console.log(`[SETUP] ${logPrefix} already confirmed and configured.`);
    } else {
      console.log(`[SETUP] Updating ${logPrefix.toLowerCase()} password and confirmation...`);
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
        email_confirm: true,
        user_metadata: { role },
      });
    }
  } else {
    console.log(`[SETUP] Creating ${logPrefix}...`);
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
      email_confirm: true,
      user_metadata: { name: `E2E ${nameSuffix}`, role },
    });

    if (error) {
      if (
        error.message.includes("already been registered") ||
        error.message.includes("Database error")
      ) {
        console.log(`[SETUP] ${logPrefix} already exists (race condition), fetching ID...`);
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const retryUser = listData?.users.find((u) => u.email === email);
        if (!retryUser) {
          throw new Error(
            `Failed to create ${logPrefix.toLowerCase()} AND failed to find it after race condition: ${error.message}`
          );
        }
        userId = retryUser.id;
      } else {
        throw new Error(`Failed to create ${logPrefix.toLowerCase()}: ${error.message}`);
      }
    } else {
      console.log(`[SETUP] ✅ ${logPrefix} created:`, data.user.id);
      userId = data.user.id;
    }
  }

  console.log(`[SETUP] Upserting ${logPrefix.toLowerCase()} profile...`);
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      email,
      role,
      is_enabled: true,
      username: `e2e-${role}-${userId.slice(0, 8)}`,
      credit_balance: E2E_CONFIG.DEFAULTS.INITIAL_CREDITS,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(`Failed to upsert ${logPrefix.toLowerCase()} profile: ${profileError.message}`);
  }

  return { id: userId, email };
}

export function getTestUserEmail(workerIndex: number): string {
  const baseEmail = process.env.E2E_TEST_EMAIL || "test.user@example.com";
  const [, domain] = baseEmail.split("@");
  return `test.user.${workerIndex}@${domain}`;
}

export function getAdminEmail(workerIndex: number): string {
  const baseEmail = E2E_CONFIG.USERS.ADMIN.EMAIL || "test.admin@example.com";
  const [, domain] = baseEmail.split("@");
  return `test.admin.${workerIndex}@${domain}`;
}

export function getSuperAdminEmail(workerIndex: number): string {
  const baseEmail = E2E_CONFIG.USERS.SUPER_ADMIN.EMAIL || "test.superadmin@example.com";
  const [, domain] = baseEmail.split("@");
  return `test.superadmin.${workerIndex}@${domain}`;
}

export async function ensureTestUserExists(
  supabaseAdmin: SupabaseClient,
  workerIndex: number
): Promise<{ id: string; email: string }> {
  return ensureUserExists(
    supabaseAdmin,
    workerIndex,
    "user",
    getTestUserEmail,
    "test user",
    "Test User"
  );
}

export async function ensureAdminUserExists(
  supabaseAdmin: SupabaseClient,
  workerIndex: number
): Promise<{ id: string; email: string }> {
  return ensureUserExists(
    supabaseAdmin,
    workerIndex,
    "admin",
    getAdminEmail,
    "ADMIN user",
    "Admin User"
  );
}

export async function ensureSuperAdminUserExists(
  supabaseAdmin: SupabaseClient,
  workerIndex: number
): Promise<{ id: string; email: string }> {
  return ensureUserExists(
    supabaseAdmin,
    workerIndex,
    "super_admin",
    getSuperAdminEmail,
    "SUPER ADMIN user",
    "Super Admin User"
  );
}

async function injectSupabaseSession(page: Page, email: string): Promise<void> {
  console.log(`[AUTH] Getting real session tokens for ${email} via signInWithPassword...`);

  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl!, anonKey!);

  const { data, error } = await client.auth.signInWithPassword({
    email: email,
    password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
  });

  if (error || !data.session) {
    throw new Error(`Failed to sign in for tokens: ${error?.message}`);
  }

  const { access_token, refresh_token, expires_in, expires_at } = data.session;
  const baseURL = process.env.E2E_BASE_URL || "http://localhost";

  await page.goto(`${baseURL}/dashboard`);

  const sessionData = {
    access_token,
    refresh_token,
    expires_in,
    expires_at,
    token_type: "bearer",
    user: data.user,
  };

  const sessionJson = JSON.stringify(sessionData);

  const projectRef = new URL(supabaseUrl!).hostname.split(".")[0];
  const encodedSession = encodeURIComponent(sessionJson);
  const cookies = [
    { name: `sb-magazyn-auth-token`, value: encodedSession },
    { name: `sb-${projectRef}-auth-token`, value: encodedSession },
    { name: `sb-localhost-auth-token`, value: encodedSession },
    { name: `sb-host-auth-token`, value: encodedSession },
    { name: `supabase-auth-token`, value: encodedSession },
    { name: `magazyn-auth-token`, value: encodedSession },
  ];

  await page
    .context()
    .addCookies([
      ...cookies.map((c) => ({ ...c, domain: "localhost", path: "/", sameSite: "Lax" as const })),
      ...cookies.map((c) => ({ ...c, domain: "127.0.0.1", path: "/", sameSite: "Lax" as const })),
    ]);

  await page.reload({ waitUntil: "domcontentloaded" });

  try {
    await page.getByTestId("topbar").waitFor({ state: "visible", timeout: 5000 });
  } catch {
    console.warn("[AUTH] ⚠️ Topbar not visible after reload, continuing anyway");
  }
}

/* eslint-disable react-hooks/rules-of-hooks */
export const test = base.extend<AuthFixtures, WorkerFixtures>({
  workerIndex: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, workerInfo) => {
      await use(workerInfo.workerIndex);
    },
    { scope: "worker" },
  ],

  supabaseAdmin: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const client = createSupabaseAdmin();
      await use(client);
    },
    { scope: "worker" },
  ],

  testUser: [
    async ({ supabaseAdmin, workerIndex }, use) => {
      const user = await ensureTestUserExists(supabaseAdmin, workerIndex);
      await use(user);
    },
    { scope: "worker" },
  ],

  adminUser: [
    async ({ supabaseAdmin, workerIndex }, use) => {
      const user = await ensureAdminUserExists(supabaseAdmin, workerIndex);
      await use(user);
    },
    { scope: "worker" },
  ],

  superAdminUser: [
    async ({ supabaseAdmin, workerIndex }, use) => {
      const user = await ensureSuperAdminUserExists(supabaseAdmin, workerIndex);
      await use(user);
    },
    { scope: "worker" },
  ],

  // Worker-scoped cleanup: Clear pending reservations for all test users
  // This prevents test state pollution across tests in the same worker
  userCleanup: async ({ supabaseAdmin, testUser, adminUser, superAdminUser }, use) => {
    await use();
    console.log("[CLEANUP] Clearing pending reservations for test users...");
    await clearPendingReservations(supabaseAdmin, testUser.id);
    await clearPendingReservations(supabaseAdmin, adminUser.id);
    await clearPendingReservations(supabaseAdmin, superAdminUser.id);
  },

  testEquipment: async ({ supabaseAdmin, workerIndex }, use) => {
    const equipment = await createTestEquipment(
      supabaseAdmin,
      workerIndex,
      E2E_CONFIG.DEFAULTS.DEFAULT_EQUIPMENT_COUNT
    );
    await use(equipment);
    const equipmentIds = equipment.map((e) => e.id);
    await cleanupTestEquipment(supabaseAdmin, equipmentIds);
  },

  authenticatedPage: async ({ browser, testUser, supabaseAdmin }, use) => {
    console.log("[AUTH] Setting up authenticated page...");
    await ensureSeedEquipmentExists(supabaseAdmin);
    const context = await browser.newContext();
    const page = await context.newPage();
    await injectSupabaseSession(page, testUser.email);
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser, adminUser }, use) => {
    console.log("[AUTH] Setting up ADMIN page...");
    const context = await browser.newContext();
    const page = await context.newPage();
    await injectSupabaseSession(page, adminUser.email);
    await use(page);
    await context.close();
  },

  superAdminPage: async ({ browser, superAdminUser }, use) => {
    console.log("[AUTH] Setting up SUPER ADMIN page...");
    const context = await browser.newContext();
    const page = await context.newPage();
    await injectSupabaseSession(page, superAdminUser.email);
    await use(page);
    await context.close();
  },
});

export { expect } from "@playwright/test";
