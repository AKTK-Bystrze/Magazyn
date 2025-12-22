# Admin E2E Test Plan

## Goal
Implement End-to-End tests for the **Admin** user role to ensure the admin dashboard and workflows are functioning correctly.

## Status Quo
- Currently, there are NO E2E tests covering the `admin` role.
- Existing tests only cover `user` role via `authenticatedPage` fixture.
- `ensureTestUserExists` actively reinforces `role: 'user'` for the default test user.

## Proposed Changes

### 1. Configuration (`frontend/e2e/constants/config.ts`)
- Add `ADMIN` user configuration to `E2E_CONFIG.USERS`.
- Define default admin credentials (via env vars).

### 2. Fixtures (`frontend/e2e/fixtures/index.ts`)
- **New helper**: `ensureTestAdminUserExists(supabaseAdmin)`
  - Creates or updates a specific admin user (e.g., `test.admin@example.com`).
  - **Crucial**: Sets `role: 'admin'` in `user_metadata` and `profiles` table.
- **New fixture**: `adminUser`
  - Ensures admin user exists and returns details.
- **New fixture**: `adminPage`
  - Similar to `authenticatedPage` but logs in as the Admin user.

### 3. Tests (`frontend/e2e/tests/admin/`)
- Create `frontend/e2e/tests/admin/dashboard.spec.ts`.
- **Happy Path**:
  - Login as Admin.
  - Navigate to Admin Dashboard.
  - specific check: Verify visibility of admin-specific elements (e.g., "Manage Equipment", "Reservations" with admin controls).
  - "Extend existing user test": Reuse patterns for logging in and element visibility assertions.

## Implementation Steps
1.  **Modify Config**: Add `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` support.
2.  **Update Fixtures**: Implement `adminPage`.
3.  **Create Test**: Write `frontend/e2e/tests/admin/dashboard.spec.ts`.
4.  **Verify**: Run the new test.

## Verification
- Run `npm run e2e -- admin/dashboard.spec.ts`
- Ensure it passes.
- Ensure regular user tests still pass (no regression).
