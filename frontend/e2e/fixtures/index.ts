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

const TEST_USER_EMAIL = process.env.E2E_TEST_EMAIL || "test.dev.g6@gmail.com";

function createSupabaseAdmin(): SupabaseClient {
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

/**
 * Ensures the STANDARD test user exists.
 */
async function ensureTestUserExists(
  supabaseAdmin: SupabaseClient
): Promise<{ id: string; email: string }> {
  console.log("[SETUP] Checking if test user exists:", TEST_USER_EMAIL);

  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const users = data?.users ?? [];
  const existingUser = users.find((u) => u.email === TEST_USER_EMAIL);
  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    // Optimization: Skip update if already confirmed and role is correct
    const isConfirmed = !!existingUser.email_confirmed_at;
    const hasRole = existingUser.user_metadata?.role === "user";

    if (isConfirmed && hasRole) {
      console.log("[SETUP] User already confirmed and configured, skipping update.");
    } else {
      console.log("[SETUP] Updating user password and confirmation...");
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
        email_confirm: true,
        user_metadata: { role: "user" },
      });
    }
  } else {
    console.log("[SETUP] Creating test user with email_confirm: true...");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
      email_confirm: true,
      user_metadata: { name: "E2E Test User" },
    });

    if (error) {
      // Fallback: If user was created by another worker in the meantime
      if (error.message.includes("already been registered")) {
        console.log("[SETUP] User already exists (race condition), fetching ID...");
        // Add delay to give Supabase Auth time to index the user
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const retryUser = listData?.users.find((u) => u.email === TEST_USER_EMAIL);
        if (!retryUser) {
          throw new Error(
            `Failed to create test user AND failed to find it after race condition: ${error.message}`
          );
        }
        userId = retryUser.id;
      } else {
        throw new Error(`Failed to create test user: ${error.message}`);
      }
    } else {
      console.log("[SETUP] ✅ Test user created:", data.user.id);
      userId = data.user.id;
    }
  }

  console.log("[SETUP] Upserting public profile...");
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      email: TEST_USER_EMAIL,
      role: "user",
      is_enabled: true,
      username: `e2e-tester-${userId.slice(0, 8)}`,
      credit_balance: E2E_CONFIG.DEFAULTS.INITIAL_CREDITS,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(`Failed to upsert profile: ${profileError.message}`);
  }

  return { id: userId, email: TEST_USER_EMAIL };
}

/**
 * Ensures the ADMIN test user exists.
 */
async function ensureAdminUserExists(
  supabaseAdmin: SupabaseClient
): Promise<{ id: string; email: string }> {
  const adminEmail = E2E_CONFIG.USERS.ADMIN.EMAIL;
  console.log("[SETUP] Checking if ADMIN user exists:", adminEmail);

  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const users = data?.users ?? [];
  const existingUser = users.find((u) => u.email === adminEmail);
  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    const isConfirmed = !!existingUser.email_confirmed_at;
    const hasRole = existingUser.user_metadata?.role === "admin";

    if (isConfirmed && hasRole) {
      console.log("[SETUP] Admin user already confirmed and configured.");
    } else {
      console.log("[SETUP] Updating admin user password and confirmation...");
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
        email_confirm: true,
        user_metadata: { role: "admin" },
      });
    }
  } else {
    console.log("[SETUP] Creating ADMIN user...");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
      email_confirm: true,
      user_metadata: { name: "E2E Admin User", role: "admin" },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log("[SETUP] Admin user already exists (race condition), fetching ID...");
        // Add delay to give Supabase Auth time to index the user
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const retryUser = listData?.users.find((u) => u.email === adminEmail);
        if (!retryUser) {
          throw new Error(
            `Failed to create admin user AND failed to find it after race condition: ${error.message}`
          );
        }
        userId = retryUser.id;
      } else {
        throw new Error(`Failed to create admin user: ${error.message}`);
      }
    } else {
      console.log("[SETUP] ✅ Admin user created:", data.user.id);
      userId = data.user.id;
    }
  }

  console.log("[SETUP] Upserting admin profile...");
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      email: adminEmail,
      role: "admin",
      is_enabled: true,
      username: `e2e-admin-${userId.slice(0, 8)}`,
      credit_balance: E2E_CONFIG.DEFAULTS.INITIAL_CREDITS,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(`Failed to upsert admin profile: ${profileError.message}`);
  }

  return { id: userId, email: adminEmail };
}

/**
 * Ensures the SUPER ADMIN test user exists.
 */
async function ensureSuperAdminUserExists(
  supabaseAdmin: SupabaseClient
): Promise<{ id: string; email: string }> {
  const adminEmail = E2E_CONFIG.USERS.SUPER_ADMIN.EMAIL;
  console.log("[SETUP] Checking if SUPER ADMIN user exists:", adminEmail);

  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const users = data?.users ?? [];
  const existingUser = users.find((u) => u.email === adminEmail);
  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    const isConfirmed = !!existingUser.email_confirmed_at;
    const hasRole = existingUser.user_metadata?.role === "super_admin";

    if (isConfirmed && hasRole) {
      console.log("[SETUP] Super Admin user already confirmed and configured.");
    } else {
      console.log("[SETUP] Updating super admin user password and confirmation...");
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
        email_confirm: true,
        user_metadata: { role: "super_admin" },
      });
    }
  } else {
    console.log("[SETUP] Creating SUPER ADMIN user...");
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: process.env.E2E_TEST_PASSWORD || "TestSecurePassword123!",
      email_confirm: true,
      user_metadata: { name: "E2E Super Admin User", role: "super_admin" },
    });

    if (error) {
      if (error.message.includes("already been registered")) {
        console.log("[SETUP] Super Admin user already exists (race condition), fetching ID...");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const retryUser = listData?.users.find((u) => u.email === adminEmail);
        if (!retryUser) {
          throw new Error(
            `Failed to create super admin user AND failed to find it after race condition: ${error.message}`
          );
        }
        userId = retryUser.id;
      } else {
        throw new Error(`Failed to create super admin user: ${error.message}`);
      }
    } else {
      console.log("[SETUP] ✅ Super Admin user created:", data.user.id);
      userId = data.user.id;
    }
  }

  console.log("[SETUP] Upserting super admin profile...");
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
    {
      id: userId,
      email: adminEmail,
      role: "super_admin",
      is_enabled: true,
      username: `e2e-superadmin-${userId.slice(0, 8)}`,
      credit_balance: E2E_CONFIG.DEFAULTS.INITIAL_CREDITS,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    throw new Error(`Failed to upsert super admin profile: ${profileError.message}`);
  }

  return { id: userId, email: adminEmail };
}

async function injectSupabaseSession(page: Page, email: string = TEST_USER_EMAIL): Promise<void> {
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

  console.log("[AUTH] Session data received:", {
    userId: data.user.id,
    email: data.user.email,
    userMetadata: data.user.user_metadata,
    sessionExpiresAt: data.session.expires_at,
  });

  const { access_token, refresh_token } = data.session;
  const baseURL = process.env.E2E_BASE_URL || "http://localhost";

  await page.goto(`${baseURL}/dashboard`);

  const sessionData = {
    access_token,
    refresh_token,
    expires_in: E2E_CONFIG.DEFAULTS.AUTH_TOKEN_EXPIRY,
    expires_at: Math.floor(Date.now() / 1000) + E2E_CONFIG.DEFAULTS.AUTH_TOKEN_EXPIRY,
    token_type: "bearer",
    user: data.user,
  };

  // Pipe browser console logs to terminal for debugging
  page.on("console", (msg) => {
    // Filter out noisy logs if needed, but for now capture everything relevant
    if (
      msg.text().includes("[Availability]") ||
      msg.text().includes("[API]") ||
      msg.text().includes("[Component]") ||
      msg.type() === "error"
    ) {
      console.log(`[BROWSER] ${msg.type()}: ${msg.text()}`);
    }
  });

  const sessionJson = JSON.stringify(sessionData);

  // Inject multiple cookie variations to handle local dev environment ambiguities
  // 1. Derived from 127.0.0.1 (standard) -> sb-127-auth-token
  // 2. Derived from localhost -> sb-localhost-auth-token
  // 3. Fallback -> supabase-auth-token
  const projectRef = new URL(supabaseUrl!).hostname.split(".")[0];
  const cookies = [
    { name: `sb-${projectRef}-auth-token`, value: sessionJson },
    { name: `sb-localhost-auth-token`, value: sessionJson },
    { name: `supabase-auth-token`, value: sessionJson },
  ];

  await page.context().addCookies(
    cookies.map((c) => ({
      ...c,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    }))
  );

  console.log(`[AUTH] ✅ Supabase SSR cookies injected: ${cookies.map((c) => c.name).join(", ")}`);
  console.log("[AUTH] Cookies injected, reloading page...");

  await page.reload({ waitUntil: "domcontentloaded" });

  console.log("[AUTH] Page reloaded. Current URL:", page.url());

  // Verify cookies are still present after reload
  const contextCookies = await page.context().cookies();
  const authCookies = contextCookies.filter((c) => c.name.includes("auth-token"));
  console.log(
    "[AUTH] Auth cookies after reload:",
    authCookies.map((c) => c.name)
  );

  try {
    await page.getByTestId("topbar").waitFor({ state: "visible", timeout: 5000 });
    console.log("[AUTH] ✅ Topbar visible - authentication successful");
  } catch {
    console.warn("[AUTH] ⚠️ Topbar not visible after reload, continuing anyway");
    console.warn("[AUTH] Current URL after topbar check:", page.url());

    // Try to capture any error messages on the page
    const bodyText = await page
      .locator("body")
      .textContent()
      .catch(() => "Could not read body");
    console.warn("[AUTH] Page body text:", bodyText?.substring(0, 500));
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
    async ({ supabaseAdmin }, use) => {
      const user = await ensureTestUserExists(supabaseAdmin);
      await use(user);
    },
    { scope: "worker" },
  ],

  adminUser: [
    async ({ supabaseAdmin }, use) => {
      const user = await ensureAdminUserExists(supabaseAdmin);
      await use(user);
    },
    { scope: "worker" },
  ],

  superAdminUser: [
    async ({ supabaseAdmin }, use) => {
      const user = await ensureSuperAdminUserExists(supabaseAdmin);
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
