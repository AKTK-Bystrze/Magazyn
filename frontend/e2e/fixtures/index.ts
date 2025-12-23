import { test as base, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createTestEquipment, cleanupTestEquipment } from '../helpers/data-setup.helper';
import { E2E_CONFIG } from '../constants';

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
  /** Supabase admin client for test setup/teardown */
  supabaseAdmin: SupabaseClient;
  /** Test user information (id and email) */
  testUser: { id: string; email: string };
  /** Admin user information (id and email) */
  adminUser: { id: string; email: string };
  /** Dedicated test equipment for this worker (created/cleaned per test) */
  testEquipment: { id: string; typeId: string }[];
}

/** Worker-scoped fixtures (shared across tests in same worker) */
interface WorkerFixtures {
  /** Worker index for parallel test isolation */
  workerIndex: number;
}

const TEST_USER_EMAIL = process.env.E2E_TEST_EMAIL || 'test.dev.g6@gmail.com';

function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env'
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
async function ensureTestUserExists(supabaseAdmin: SupabaseClient): Promise<{ id: string; email: string }> {
  console.log('[SETUP] Checking if test user exists:', TEST_USER_EMAIL);

  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const users = data?.users ?? [];
  const existingUser = users.find(u => u.email === TEST_USER_EMAIL);
  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    // Optimization: Skip update if already confirmed and role is correct
    const isConfirmed = !!existingUser.email_confirmed_at;
    const hasRole = existingUser.user_metadata?.role === 'user';

    if (isConfirmed && hasRole) {
      console.log('[SETUP] User already confirmed and configured, skipping update.');
    } else {
      console.log('[SETUP] Updating user password and confirmation...');
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
        email_confirm: true,
        user_metadata: { role: 'user' }
      });
    }
  } else {
    console.log('[SETUP] Creating test user with email_confirm: true...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
      email_confirm: true,
      user_metadata: { name: 'E2E Test User' },
    });

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }
    console.log('[SETUP] ✅ Test user created:', data.user.id);
    userId = data.user.id;
  }

  console.log('[SETUP] Upserting public profile...');
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: TEST_USER_EMAIL,
      role: 'user',
      is_enabled: true,
      username: 'e2e-tester',
      credit_balance: E2E_CONFIG.DEFAULTS.INITIAL_CREDITS
    }, { onConflict: 'id' });

  if (profileError) {
    throw new Error(`Failed to upsert profile: ${profileError.message}`);
  }

  return { id: userId, email: TEST_USER_EMAIL };
}

/**
 * Ensures the ADMIN test user exists.
 */
async function ensureAdminUserExists(supabaseAdmin: SupabaseClient): Promise<{ id: string; email: string }> {
  const adminEmail = E2E_CONFIG.USERS.ADMIN.EMAIL;
  console.log('[SETUP] Checking if ADMIN user exists:', adminEmail);

  const { data, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const users = data?.users ?? [];
  const existingUser = users.find(u => u.email === adminEmail);
  let userId: string;

  if (existingUser) {
    userId = existingUser.id;
    const isConfirmed = !!existingUser.email_confirmed_at;
    const hasRole = existingUser.user_metadata?.role === 'admin';

    if (isConfirmed && hasRole) {
      console.log('[SETUP] Admin user already confirmed and configured.');
    } else {
      console.log('[SETUP] Updating admin user password and confirmation...');
      await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
        password: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });
    }
  } else {
    console.log('[SETUP] Creating ADMIN user...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
      email_confirm: true,
      user_metadata: { name: 'E2E Admin User', role: 'admin' },
    });

    if (error) {
      throw new Error(`Failed to create admin user: ${error.message}`);
    }
    console.log('[SETUP] ✅ Admin user created:', data.user.id);
    userId = data.user.id;
  }

  console.log('[SETUP] Upserting admin profile...');
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: userId,
      email: adminEmail,
      role: 'admin',
      is_enabled: true,
      username: 'e2e-admin',
      credit_balance: E2E_CONFIG.DEFAULTS.INITIAL_CREDITS
    }, { onConflict: 'id' });

  if (profileError) {
    throw new Error(`Failed to upsert admin profile: ${profileError.message}`);
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
    password: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
  });

  if (error || !data.session) {
    throw new Error(`Failed to sign in for tokens: ${error?.message}`);
  }

  const { access_token, refresh_token } = data.session;
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4321';

  await page.goto(`${baseURL}/dashboard`);

  const sessionData = {
    access_token,
    refresh_token,
    expires_in: E2E_CONFIG.DEFAULTS.AUTH_TOKEN_EXPIRY,
    expires_at: Math.floor(Date.now() / 1000) + E2E_CONFIG.DEFAULTS.AUTH_TOKEN_EXPIRY,
    token_type: 'bearer',
    user: data.user,
  };

  const sessionJson = JSON.stringify(sessionData);

  // Inject multiple cookie variations to handle local dev environment ambiguities
  // 1. Derived from 127.0.0.1 (standard) -> sb-127-auth-token
  // 2. Derived from localhost -> sb-localhost-auth-token
  // 3. Fallback -> supabase-auth-token
  const projectRef = new URL(supabaseUrl!).hostname.split('.')[0];
  const cookies = [
    { name: `sb-${projectRef}-auth-token`, value: sessionJson },
    { name: `sb-localhost-auth-token`, value: sessionJson },
    { name: `supabase-auth-token`, value: sessionJson }
  ];

  await page.context().addCookies(cookies.map(c => ({
    ...c,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  })));

  console.log(`[AUTH] ✅ Supabase SSR cookies injected: ${cookies.map(c => c.name).join(', ')}`);

  await page.reload({ waitUntil: 'domcontentloaded' });

  try {
    await page.getByTestId('topbar').waitFor({ state: 'visible', timeout: 5000 });
  } catch {
    console.warn('[AUTH] ⚠️ Topbar not visible after reload, continuing anyway');
  }
}

/* eslint-disable react-hooks/rules-of-hooks */
export const test = base.extend<AuthFixtures, WorkerFixtures>({
  // eslint-disable-next-line no-empty-pattern
  workerIndex: [async ({ }, use, workerInfo) => {
    await use(workerInfo.workerIndex);
  }, { scope: 'worker' }],

  // eslint-disable-next-line no-empty-pattern
  supabaseAdmin: async ({}, use) => {
    const client = createSupabaseAdmin();
    await use(client);
  },

  testUser: async ({ supabaseAdmin }, use) => {
    const user = await ensureTestUserExists(supabaseAdmin);
    await use(user);
  },

  adminUser: async ({ supabaseAdmin }, use) => {
    const user = await ensureAdminUserExists(supabaseAdmin);
    await use(user);
  },

  testEquipment: async ({ supabaseAdmin, workerIndex }, use) => {
    const equipment = await createTestEquipment(supabaseAdmin, workerIndex, E2E_CONFIG.DEFAULTS.DEFAULT_EQUIPMENT_COUNT);
    await use(equipment);
    const equipmentIds = equipment.map(e => e.id);
    await cleanupTestEquipment(supabaseAdmin, equipmentIds);
  },

  authenticatedPage: async ({ browser, testUser }, use) => {
    console.log('[AUTH] Setting up authenticated page...');
    const context = await browser.newContext();
    const page = await context.newPage();
    await injectSupabaseSession(page, testUser.email);
    await use(page);
    await context.close();
  },

  adminPage: async ({ browser, adminUser }, use) => {
    console.log('[AUTH] Setting up ADMIN page...');
    const context = await browser.newContext();
    const page = await context.newPage();
    await injectSupabaseSession(page, adminUser.email);
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
