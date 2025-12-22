import { test as base, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createTestEquipment, cleanupTestEquipment } from '../helpers/data-setup.helper';

/**
 * E2E Test Fixtures with Automated Authentication
 *
 * Provides authenticated browser sessions for e2e tests using Supabase.
 * 
 * Authentication flow:
 * 1. Uses Admin API (service role key) to create/update test user with password
 * 2. Signs in via `signInWithPassword` to obtain real JWT tokens
 * 3. Injects tokens into browser localStorage + `magazyn-auth-token` cookie
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
 * Creates a Supabase admin client using service role key
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
 * Ensures test user exists with email already confirmed
 * Uses Admin API createUser with email_confirm: true
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
      credit_balance: 100
    }, { onConflict: 'id' });

  if (profileError) {
    throw new Error(`Failed to upsert profile: ${profileError.message}`);
  }

  console.log('[SETUP] ✅ Public profile upserted');

  return { id: userId, email: TEST_USER_EMAIL };
}

/**
 * Injects a valid Supabase session into the browser.
 * Signs in using password to get REAL JWT tokens, then injects them.
 */
/**
 * Injects a valid Supabase session into the browser.
 * 
 * IMPORTANT: Navigates directly to /dashboard to avoid redirect loops.
 * The root path (/) triggers middleware redirects that pollute RedirectManager history.
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

  // Use the same storage key as configured in lib/supabase.ts
  const storageKey = 'magazyn-auth-token';
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4321';

  console.log('[AUTH] Injecting session into localStorage and Cookies...');

  // CRITICAL: Navigate to /dashboard directly, NOT root 
  // This avoids triggering middleware redirect from / → /dashboard
  // which would pollute RedirectManager.redirectHistory
  await page.goto(`${baseURL}/dashboard`);

  // Prepare session object for localStorage
  const session = {
    access_token,
    refresh_token,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: 'bearer',
    user: data.user,
  };
  const sessionStr = JSON.stringify(session);

  // 1. Inject into localStorage (for client-side Supabase SDK)
  await page.evaluate(
    ({ key, value }) => {
      localStorage.setItem(key, value);
    },
    { key: storageKey, value: sessionStr }
  );

  // 2. Inject the app's auth cookie (magazyn-auth-token)
  await page.context().addCookies([
    {
      name: 'magazyn-auth-token',
      value: access_token,
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }
  ]);

  console.log('[AUTH] ✅ Session and cookie injected');

  // IMPROVED: Wait for specific UI element instead of networkidle
  // networkidle is unreliable and can cause flakiness
  await page.reload({ waitUntil: 'domcontentloaded' });

  // Wait for topbar to be visible (confirms app is fully loaded with auth)
  try {
    await page.getByTestId('topbar').waitFor({ state: 'visible', timeout: 5000 });
    console.log('[AUTH] ✅ Session activated - topbar visible');
  } catch {
    console.warn('[AUTH] ⚠️ Topbar not visible after reload, continuing anyway');
  }

  // Verify session was stored
  const storedSession = await page.evaluate((key) => {
    return localStorage.getItem(key) ? 'Session found' : 'Session NOT found';
  }, storageKey);

  console.log('[AUTH] Verification:', storedSession);
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
    // Ensure test user exists and return user info
    const user = await ensureTestUserExists(supabaseAdmin);
    await use(user);
  },

  testEquipment: async ({ supabaseAdmin, workerIndex }, use) => {
    // Create dedicated equipment for this worker
    const equipment = await createTestEquipment(supabaseAdmin, workerIndex, 2);

    await use(equipment);

    // Cleanup: Delete equipment and any reservations
    const equipmentIds = equipment.map(e => e.id);
    await cleanupTestEquipment(supabaseAdmin, equipmentIds);
    console.log(`[Worker ${workerIndex}] ✅ Cleaned up test equipment`);
  },

  authenticatedPage: async ({ browser }, use) => {
    console.log('[AUTH] Setting up authenticated page...');

    // Create new context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    // Inject valid session into browser
    await injectSupabaseSession(page);

    // NOTE: RedirectManager now uses request-scoped contexts
    // No need to reset global state - each request/component gets fresh context
    console.log('[AUTH] ✅ RedirectManager uses request-scoped contexts (no reset needed)');

    console.log('[AUTH] ✅ Authenticated page ready');

    await use(page);
    
    // Cleanup
    await context.close();
  },
});

export { expect } from '@playwright/test';
