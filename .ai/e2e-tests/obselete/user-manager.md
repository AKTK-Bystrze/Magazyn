# E2E Test Plan: User Manager

> **Status**: Planning
> **Compliance**: [Frontend Rules](../frontend/docs/rules/frontend.md), [E2E Rules](../frontend/docs/rules/playwright-e2e-itesting.md)

## 1. New Page Object Model
**File**: `frontend/e2e/page-objects/admin-users.pom.ts`

### Class: `AdminUsersPage`
- **Constructor**: Accepts `Page`.
- **Methods**:
  - `goto()`: Navigates to `/admin/users`.
  - `searchUser(query: string)`: Interacts with search input.
  - `openEditModal(email: string)`: Clicks edit on specific user.
  - `updateUserRole(role: UserRole)`: Selects new role in modal.
  - `getUsersTable()`: Returns table locator.

## 2. Test Scenarios (`tests/admin/users.spec.ts`)

**Global Config**:
- Viewport: Mobile (Pixel 5).
- User: `superAdminPage` (Super Admin role).

### Scenario 1: Super Admin User Management Lifecycle
**Goal**: Verify the entire user management flow (List -> Search -> Edit -> Verify) in a single unified test.
- **Fixture**: `superAdminPage`, `supabaseAdmin`.
- **Pre-condition**: Ensure a target user exists (via `supabaseAdmin` or `testUser`).
- **Steps**:
    1. **Navigate**: Go to `/admin/users`.
    2. **List verification**: 
       - Assert table is visible.
       - Assert columns [Email, Role, Status] are visible.
       - **Visual Check**: `await expect(page).toHaveScreenshot('admin-users-list.png')`.
    3. **Search Interaction**:
       - Fill search input with target user's email.
       - Verify table filters to show only that user.
    4. **Edit Flow**:
       - Click "Edit" on the filtered user.
       - Change actions:
         - Toggle "Is Active" status.
         - Change Role to 'Admin'.
       - Click "Save".
    5. **Verification**:
       - Assert success toast appears.
       - Assert user row now displays 'Admin' role.
       - Assert user row displays updated status.

## 3. Required Constants (`constants/test-ids.ts`)
- `ADMIN_USERS_TABLE`
- `ADMIN_USER_ROW_${EMAIL}`
- `ADMIN_SEARCH_INPUT`
- `ADMIN_EDIT_USER_BTN`
- `ADMIN_SAVE_USER_BTN`
