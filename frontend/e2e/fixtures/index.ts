import { test as base, type Page } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
 * - `VITE_SUPABASE_URL` / `SUPABASE_URL`
 * - `VITE_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
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

interface AuthFixtures {
  /** Pre-authenticated page with test user session */
  authenticatedPage: Page;
  /** Supabase admin client for test setup/teardown */
  supabaseAdmin: SupabaseClient;
}

const TEST_USER_EMAIL = process.env.E2E_TEST_EMAIL || 'test.dev.g6@gmail.com';

/**
 * Creates a Supabase admin client using service role key
 */
function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env'
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

  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();

  if (listError) {
    throw new Error(`Failed to list users: ${listError.message}`);
  }

  const existingUser = users.find(u => u.email === TEST_USER_EMAIL);

  if (existingUser) {
    console.log('[SETUP] ✅ Test user exists:', existingUser.id);

    // Ensure password and confirmation are set correctly
    console.log('[SETUP] Updating user password and confirmation...');
    await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
      password: process.env.E2E_TEST_PASSWORD || 'TestSecurePassword123!',
      email_confirm: true,
    });

    return { id: existingUser.id, email: existingUser.email! };
  }

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

  return { id: data.user.id, email: data.user.email! };
}

/**
 * Injects a valid Supabase session into the browser
 * Signs in using password to get REAL JWT tokens, then injects them
 */ async function injectSupabaseSession(
   page: Page,
   supabaseAdmin: SupabaseClient,
   userId: string
 ): Promise<void> {
   console.log('[AUTH] Getting real session tokens via signInWithPassword...');

   // Use a separate client to sign in (not admin) to get the session
   const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
   const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
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

   // Get the Supabase project reference from URL for storage key naming
   const projectRef = new URL(supabaseUrl!).hostname.split('.')[0];
   const storageKey = `sb-${projectRef}-auth-token`;

   console.log('[AUTH] Injecting session into localStorage and Cookies...');
   console.log('[AUTH] Storage key:', storageKey);

   // Navigate to the app first so we have the right origin
   const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4321';
   await page.goto(baseURL);

   // Prepare session object
   const session = {
     access_token,
     refresh_token,
     expires_in: 3600,
     expires_at: Math.floor(Date.now() / 1000) + 3600,
     token_type: 'bearer',
     user: data.user,
   };
   const sessionStr = JSON.stringify(session);

   // 1. Inject into localStorage (legacy/client-side)
   await page.evaluate(
     ({ key, value }) => {
       localStorage.setItem(key, value);
       console.log('[BROWSER] Session injected into localStorage:', key);
     },
     { key: storageKey, value: sessionStr }
   );

   // 2. Inject the app's specific auth cookie (magazyn-auth-token)
   // The app uses a custom cookie that stores ONLY the access_token
   await page.context().addCookies([
     {
       name: 'magazyn-auth-token',  // App's custom cookie name
       value: access_token,          // Just the token, not JSON
       domain: 'localhost',
       path: '/',
       httpOnly: false,
       secure: false,
       sameSite: 'Lax',
     }
   ]);

   console.log('[AUTH] ✅ magazyn-auth-token cookie injected');

   // Reload page to let the app pick up the session  
   console.log('[AUTH] Reloading page to activate session...');
   await page.reload({ waitUntil: 'networkidle' });


   // Verify it was set
   const storedSession = await page.evaluate((key) => {
     const value = localStorage.getItem(key);
     return value ? 'Session found' : 'Session NOT found';
   }, storageKey);

   console.log('[AUTH] Verification:', storedSession);

   // Reload page to let Supabase client pick up the session  
   console.log('[AUTH] Reloading page to activate session...');
   await page.reload({ waitUntil: 'networkidle' });

   console.log('[AUTH] ✅ Session injected and activated');
}

export const test = base.extend<AuthFixtures>({
  supabaseAdmin: async ({}, use) => {
    const client = createSupabaseAdmin();
    await use(client);
  },

  authenticatedPage: async ({ browser, supabaseAdmin }, use) => {
    console.log('[AUTH] Setting up authenticated page...');

    // Ensure test user exists (creates if needed, with email confirmed)
    const user = await ensureTestUserExists(supabaseAdmin);

    // Create new context and page
    const context = await browser.newContext();
    const page = await context.newPage();

    // Inject valid session into browser
    await injectSupabaseSession(page, supabaseAdmin, user.id);

    console.log('[AUTH] ✅ Authenticated page ready');

    await use(page);
    
    // Cleanup
    await context.close();
  },
});

export { expect } from '@playwright/test';
