# Auth Debugging Plan

## Problem Analysis
User reports that the magic link token is invalid when used. Examination of the codebase reveals that the frontend (`frontend/src`) appears to lack a Supabase client initialization file (expected at `src/lib/supabase.ts` or similar), and there is no logic in `Layout.astro` or `index.astro` to handle the `access_token` hash fragment from the URL.

The URL provided (`http://localhost:4321/#access_token=...`) utilizes the Implicit Grant flow (token in hash), which requires client-side JavaScript to capture and process. Without a Supabase client listening for auth state changes, the token is ignored, and the user remains unauthenticated.

## Debugging Steps

### 1. Verify Environment & Dependencies
- [x] Check `frontend/package.json` for `@supabase/supabase-js` dependency.
- [x] Verify `frontend/.env` contains `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`.

### 2. Verify Supabase Client Initialization
- [x] Confirm absence of `src/lib/supabase.ts` (or equivalent).
- [x] **Action**: Create `src/lib/supabase.ts` to initialize `createClient`.

### 3. Verify Auth State Handling
- [x] Confirm `src/layouts/Layout.astro` or `src/pages/index.astro` does not import/use Supabase client.
- [x] **Action**: Add an `AuthListener` component (or script in Layout) that runs `supabase.auth.onAuthStateChange` to capture the session from the URL hash.

### 4. Verify Backend Integration
- [x] Ensure backend `auth.middleware.go` is correctly validating tokens. (Code review suggests it calls `GetUser()` which is correct).
- [x] Ensure `frontend/src/lib/api.ts` (or wherever API calls are made) includes the `Authorization: Bearer <token>` header when making requests. (Currently `api.ts` does NOT seem to attach the token automatically).

## Resolution Summary (Actions Taken)

To fix the authentication flow, the following actions were taken:

1.  **Frontend Supabase Client**: Created `frontend/src/lib/supabase.ts` to initialize the `createClient` for client-side usage. 
    *   *Correction*: Adjusted environment variable names to `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to match the project's `.env` content.
    *   *Correction*: Updated `frontend/src/db/supabase.client.ts` to handle SSR safer (non-persistence) and correct env var loading.

2.  **Auth Listener Component**: Created `frontend/src/components/auth/AuthListener.tsx`. This component listens for the `onAuthStateChange` event, specifically capturing the token from the URL hash (magic link redirection) and setting the session.

3.  **Layout Integration**: Integrated `AuthListener` into `frontend/src/layouts/Layout.astro` so it runs globally on the application, ensuring auth state is captured immediately upon redirection.

4.  **API Client Authorization**: Updated `frontend/src/lib/api.ts` to retrieve the current session's `access_token` and attach it as a `Bearer` token in the `Authorization` header for all requests.

5.  **Environment Configuration**:
    *   Updated `frontend/astro.config.mjs` to include `PUBLIC_` in the `envPrefix` (though later realized `VITE_` was preferred by user's env file, the config update ensures broader compatibility if needed).

6.  **CORS Configuration**: Updated `backend/internal/middleware/cors.middleware.go` to use a dynamic `Access-Control-Allow-Origin` based on the request `Origin` header (instead of hardcoded `localhost:4321`). This fixed issues where the frontend running on fallback ports (e.g., `4322`) was blocked by CORS.

These changes collectively ensure that the magic link token is captured, the session is established, and subsequent API requests are properly authenticated.
