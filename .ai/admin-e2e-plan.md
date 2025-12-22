# Admin E2E Test Plan

## Goal
Implement End-to-End tests for the **Admin** user role, specifically focusing on the ability to create reservations *on behalf of other users* and manage them.

## Status Quo
- Currently, there are NO E2E tests covering the `admin` role.
- Existing tests only cover `user` role.
- Use `UserSelector` component exists in `ReservationCartView` but is not covered by E2E tests.

## Proposed Changes

### 1. Configuration (`frontend/e2e/constants/config.ts`)
- **Action**: Restore/Add `ADMIN` user configuration to `E2E_CONFIG.USERS`.
- Define default admin credentials `test.admin.g6@gmail.com`.

### 2. Fixtures (`frontend/e2e/fixtures/index.ts`)
- **Action**: Re-implement Admin fixtures (previously reverted).
- `ensureUserExists(..., role: 'admin')`: Helper to create/update admin user.
- `adminUser`: Fixture that provides admin user details.
- `adminPage`: Fixture that provides a page authenticated as Admin.

### 3. Page Object Model (`frontend/e2e/page-objects/reservation-cart.pom.ts`)
- **Update**: `ReservationCartPOM`
- **New Method**: `selectUser(usernameOrEmail: string)`
  - Should click the User Selector trigger (`#user-selector`).
  - Should select the user from the dropdown (`role=option` or `SelectItem`).
  - Should verify the selection (e.g., check trigger text).

### 4. Tests (`frontend/e2e/tests/admin/reservation-management.spec.ts`)
- **New Test File**: `frontend/e2e/tests/admin/reservation-management.spec.ts`
- **Scenario**: "Happy Path: Admin creates reservation for user and denies it"
  - **Actors**: `adminUser` (Actor), `activeUser` (Target).
  - **Setup**: 
    - Ensure Admin exists.
    - Ensure a Standard User (`activeUser`) exists (target for reservation).
    - Create Test Equipment (isolated).
  - **Steps**:
    1.  Login as Admin (`adminPage`).
    2.  Add equipment to cart.
    3.  Go to Cart.
    4.  **Select `activeUser`** from the "Select User" dropdown.
    5.  Proceed to Checkout (Select dates -> Confirm).
    6.  Verify redirection to success page.
    7.  Navigate to "All Reservations" view (`/reservations?scope=all` or check "All" filter).
    8.  Find the newly created reservation (by ID).
    9.  Verify user attribution (optional/if visible).
    10. Click "Change Status" -> "Denied".
    11. Confirm denial in the dialog.
    12. **Assertion**: Verify reservation status badge shows "DENIED".

## Implementation Steps
1.  **Config & Fixtures**: Re-apply changes to `config.ts` and `fixtures/index.ts`.
2.  **POM Update**: Add user selection logic to `ReservationCartPOM`.
3.  **Test Creation**: Write `reservation-management.spec.ts` implementing the above scenario.
4.  **Verify**: Run the test.

## Verification
- Run `npm run e2e -- admin/reservation-management.spec.ts`
