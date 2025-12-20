import { test as base, type Page, type BrowserContext } from '@playwright/test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Extended test fixtures for authenticated e2e testing.
 * Provides pre-authenticated page using Supabase admin session injection.
 */

interface AuthFixtures {
  /** Pre-authenticated page with test user session */
  authenticatedPage: Page;
  /** Supabase admin client for test setup/teardown */
  supabaseAdmin: SupabaseClient;
}

/**
 * Creates a Supabase admin client using service role key.
 * Required for session creation and user management in tests.
 */
function createSupabaseAdmin(): SupabaseClient {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. ' +
      'Ensure VITE_SUPABASE_URL (or SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY are set in .env'
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
 * Generates a magic link for the test user and extracts auth tokens.
 * Uses Supabase admin API generateLink method.
 */
async function getAuthTokensForUser(
  supabaseAdmin: SupabaseClient,
  testEmail: string
): Promise<{ access_token: string; refresh_token: string }> {
  // Generate magic link - this returns tokens we can use directly
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email: testEmail,
  });

  if (error || !data) {
    throw new Error(`Failed to generate magic link for ${testEmail}. Error: ${error?.message}`);
  }

  // The generated link contains a token we can use to sign in
  // We need to extract the token and exchange it for a session
  const linkUrl = new URL(data.properties.action_link);
  const token = linkUrl.searchParams.get('token');
  const type = linkUrl.searchParams.get('type');

  if (!token || !type) {
    throw new Error('Failed to extract token from magic link');
  }

  // Verify the OTP to get a session
  const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.verifyOtp({
    token_hash: token,
    type: 'magiclink',
  });

  if (sessionError || !sessionData.session) {
    throw new Error(`Failed to verify OTP. Error: ${sessionError?.message}`);
  }

  return {
    access_token: sessionData.session.access_token,
    refresh_token: sessionData.session.refresh_token,
  };
}

/**
 * Injects authentication cookies into the browser context.
 */
async function injectAuthSession(
  context: BrowserContext,
  supabaseAdmin: SupabaseClient,
  testEmail: string
): Promise<void> {
  const { access_token, refresh_token } = await getAuthTokensForUser(supabaseAdmin, testEmail);

  const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL)!;
  
  // Extract project ref from URL for cookie naming
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  
  // Set Supabase auth cookies
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:4321';
  const domain = new URL(baseURL).hostname;
  
  await context.addCookies([
    {
      name: `sb-${projectRef}-auth-token`,
      value: JSON.stringify({
        access_token,
        refresh_token,
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }),
      domain,
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    },
  ]);
}

export const test = base.extend<AuthFixtures>({
  supabaseAdmin: async ({}, use) => {
    const client = createSupabaseAdmin();
    await use(client);
  },

  authenticatedPage: async ({ browser, supabaseAdmin }, use) => {
    const testEmail = process.env.E2E_TEST_EMAIL;
    
    if (!testEmail) {
      throw new Error('E2E_TEST_EMAIL environment variable is not set');
    }

    // Create new context and inject auth
    const context = await browser.newContext();
    await injectAuthSession(context, supabaseAdmin, testEmail);
    
    // Create page from authenticated context
    const page = await context.newPage();
    
    await use(page);
    
    // Cleanup
    await context.close();
  },
});

export { expect } from '@playwright/test';

