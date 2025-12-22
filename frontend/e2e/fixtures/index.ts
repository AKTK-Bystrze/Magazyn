import { test as base, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createTestEquipment, cleanupTestEquipment } from '../helpers/data-setup.helper';
import { E2E_CONFIG } from '../constants';

/**
 * E2E Test Fixtures with Automated Authentication
 *
 * Provides authenticated browser sessions for e2e tests using Supabase.
 * 
 * Authentication flow:
 * 1. Uses Admin API (service role key) to create/update test user with password
 * 2. Signs in via `signInWithPassword` to obtain real JWT tokens
 * 3. Injects tokens into Supabase SSR cookies (sb-*-auth-token)
 * 4. Browser reload activates the session for SSR middleware
 *
 * Required environment variables:
 * - `PUBLIC_SUPABASE_URL`
 * - `PUBLIC_SUPABASE_ANON_KEY`
 * - `SUPABASE_SERVICE_ROLE_KEY`
 * - `E2E_TEST_EMAIL`
 * - `E2E_TEST_PASSWORD` (optional, default: 'TestSecurePassword123!')
 *
 * @example
 * ```typescript
 * import { test, expect } from './fixtures';
 *
 * test('protected page', async ({ authenticatedPage }) => {
 *   await authenticatedPage.goto('/equipment');
 *   await expect(authenticatedPage.getByTestId('equipment-grid')).toBeVisible();
 * });
 * ```
 */

/** Test-scoped fixtures (created per test) */
interface AuthFixtures {
  /** Pre-authenticated page with test user session */
  authenticatedPage: Page;
  /** Supabase admin client for test setup/teardown */
  supabaseAdmin: SupabaseClient;
  /** Test user information (id and email) */
  testUser: { id: string; email: string };
  /** Dedicated test equipment for this worker (created/cleaned per test) */
  testEquipment: { id: string; typeId: string }[];
}

/** Worker-scoped fixtures (shared across tests in same worker) */
interface WorkerFixtures {
  /** Worker index for parallel test isolation */
  workerIndex: number;
}

const TEST_USER_EMAIL = process.env.E2E_TEST_EMAIL || 'test.dev.g6@gmail.com';

/**
 * Creates a Supabase admin client using the service role key.
 * Used for administrative tasks like user management and data cleanup.
 *
 * @returns A SupabaseClient instance with service role privileges.
 * @throws An error if required environment variables are missing.
 */
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
 * Ensures a test user exists and confirms their email.
 * Uses the Admin API to create the user or update their password if they exist.
 *
 * @param supabaseAdmin - The Supabase admin client.
 * @returns A promise that resolves to the user's ID and email.
 * @throws An error if user listing, creation, or profile upsert fails.
 */
async function ensureTestUserExists(supabaseAdmin: SupabaseClient): Promise<{ id: string; email: string }> {
  console.log('[SETUP] Checking if test user exists:', TEST_USER_EMAIL);

  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

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
    // Create test user with email already confirmed and password
    console.log('[SETUP] Creating test user with email_confirm: true...');
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_USER_EMAIL,
      password: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
      email_confirm: true,
      user_metadata: {
        name: 'E2E Test User',
      },
    });

    if (error) {
      throw new Error(`Failed to create test user: ${error.message}`);
    }

    console.log('[SETUP] ✅ Test user created:', data.user.id);
    userId = data.user.id;
  }

  // Ensure public profile exists (required for backend session fetch)
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

  console.log('[SETUP] ✅ Public profile upserted');

  return { id: userId, email: TEST_USER_EMAIL };
}

/**
 * Injects a valid Supabase session directly into the browser context.
 * Uses `@supabase/ssr` cookie format (`sb-<project-ref>-auth-token`).
 *
 * IMPORTANT: Navigates directly to /dashboard to avoid redirect loops and triggers a reload.
 *
 * @param page - The Playwright Page instance.
 * @returns A promise that resolves when the session is injected and the page is loaded.
 */
async function injectSupabaseSession(page: Page): Promise<void> {
  console.log('[AUTH] Getting real session tokens via signInWithPassword...');

  // Use a separate client to sign in (not admin) to get the session
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
  const anonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;
  const client = createClient(supabaseUrl!, anonKey!);

  const { data, error } = await client.auth.signInWithPassword({
    email: TEST_USER_EMAIL,
    password: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
  });

  if (error || !data.session) {
    throw new Error(`Failed to sign in for tokens: ${error?.message}`);
  }

  const { access_token, refresh_token } = data.session;
  console.log('[AUTH] ✅ Real tokens obtained');

  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4321';

  console.log('[AUTH] Injecting Supabase SSR cookies...');

  // CRITICAL: Navigate to /dashboard directly, NOT root 
  await page.goto(`${baseURL}/dashboard`);

  // Extract project reference from Supabase URL
  // e.g., "https://gwamxxqarkcpvgzvpanc.supabase.co" → "gwamxxqarkcpvgzvpanc"
  const projectRef = new URL(supabaseUrl!).hostname.split('.')[0];
  const cookieName = `sb-${projectRef}-auth-token`;

  // Prepare session object for Supabase SSR cookie
  const sessionData = {
    access_token,
    refresh_token,
    expires_in: E2E_CONFIG.DEFAULTS.AUTH_TOKEN_EXPIRY,
    expires_at: Math.floor(Date.now() / 1000) + E2E_CONFIG.DEFAULTS.AUTH_TOKEN_EXPIRY,
    token_type: 'bearer',
    user: data.user,
  };

  await page.context().addCookies([
    {
      name: cookieName,
      value: JSON.stringify(sessionData),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }
  ]);

  console.log(`[AUTH] ✅ Supabase SSR cookie injected: ${cookieName}`);

  // Reload to activate the session
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Wait for topbar to be visible (confirms app is fully loaded with auth)
  try {
    await page.getByTestId('topbar').waitFor({ state: 'visible', timeout: 5000 });
    console.log('[AUTH] ✅ Session activated - topbar visible');
  } catch {
    console.warn('[AUTH] ⚠️ Topbar not visible after reload, continuing anyway');
  }
}

/* eslint-disable react-hooks/rules-of-hooks */
export const test = base.extend<AuthFixtures, WorkerFixtures>({
  /**
   * Provides the worker index to the test.
   * Useful for creating unique resource names to avoid collisions in parallel execution.
   */
  // eslint-disable-next-line no-empty-pattern
  workerIndex: [async ({ }, use, workerInfo) => {
    await use(workerInfo.workerIndex);
  }, { scope: 'worker' }],

  /**
   * Provides an authenticated Supabase admin client.
   * This client has service role privileges and should be used for setup/teardown only.
   */
  // eslint-disable-next-line no-empty-pattern
  supabaseAdmin: async ({}, use) => {
    const client = createSupabaseAdmin();
    await use(client);
  },

  /**
   * Provides a valid test user.
   * Ensures the user exists in Supabase and returns their ID and email.
   */
  testUser: async ({ supabaseAdmin }, use) => {
    // Ensure test user exists and return user info
    const user = await ensureTestUserExists(supabaseAdmin);
    await use(user);
  },

  /**
   * Provides a set of test equipment dedicated to the current worker.
   * Creates the equipment before the test and cleans it up afterwards.
   */
  testEquipment: async ({ supabaseAdmin, workerIndex }, use) => {
    const equipment = await createTestEquipment(supabaseAdmin, workerIndex, E2E_CONFIG.DEFAULTS.DEFAULT_EQUIPMENT_COUNT);

    await use(equipment);

    const equipmentIds = equipment.map(e => e.id);
    await cleanupTestEquipment(supabaseAdmin, equipmentIds);
  },

  /**
   * Provides a browser page authenticated with the test user's session.
   * Injects the session cookie before the test starts.
   */
  authenticatedPage: async ({ browser }, use) => {
    console.log('[AUTH] Setting up authenticated page...');

    // Create new context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    await injectSupabaseSession(page);

    console.log('[AUTH] ✅ Authenticated page ready');

    await use(page);

    await context.close();
  },
});

export { expect } from '@playwright/test';
