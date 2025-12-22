# E2E Test Plan: User Reservation Creation Workflow

> Comprehensive E2E tests covering the complete user journey from browsing equipment to finalizing a reservation.

---

## Overview

This plan outlines E2E tests for the reservation creation workflow based on user stories:
- **US-009** to **US-013**: Core creation flow (selection → dates → confirmation → finalization)
- **US-016, US-047**: Date modification after reservation
- **US-042, US-046, US-050**: Validation and error handling
- **US-051**: Equipment filtering by availability

The tests follow patterns established in [equipment.spec.ts](file:///e:/bystrze/Magazyn/frontend/e2e/equipment.spec.ts) and [e2e-testing.md](file:///e:/bystrze/Magazyn/frontend/docs/e2e-testing.md).

---

## Test Isolation Strategy

> [!IMPORTANT]
> Each test MUST be independent. Tests create their own prerequisites and clean up after themselves.

### Principles
1. **Setup in `beforeEach`**: Create required data (reservations, cart items) per test
2. **Cleanup in `afterEach`/`afterAll`**: Cancel created reservations, clear cart, restore credits
3. **Failure-safe cleanup**: Use `try/finally` or Playwright's built-in cleanup hooks
4. **No shared state**: Tests never depend on other tests' side effects

### Second Test User
For multi-user conflict scenarios, create a second authenticated user:

```typescript
// In fixtures/index.ts - extend with secondAuthenticatedPage
const SECOND_USER_EMAIL = 'e2e-test-user2@example.com';

secondAuthenticatedPage: async ({ browser, supabaseAdmin }, use) => {
  // Create second user via service role
  const { data: { users } } = await supabaseAdmin.auth.admin.listUsers();
  let secondUser = users.find(u => u.email === SECOND_USER_EMAIL);
  
  if (!secondUser) {
    const { data } = await supabaseAdmin.auth.admin.createUser({
      email: SECOND_USER_EMAIL,
      password: 'TestSecurePassword123!',
      email_confirm: true,
    });
    secondUser = data.user;
    
    // Create profile
    await supabaseAdmin.from('profiles').upsert({
      id: secondUser.id,
      email: SECOND_USER_EMAIL,
      role: 'user',
      is_enabled: true,
      username: 'e2e-tester-2',
      credit_balance: 100
    });
  }
  
  // ... inject session same as primary user
};
```

---

## Test Structure

```
frontend/e2e/
├── reservation-creation.spec.ts      # [NEW] Main test file
├── page-objects/
│   ├── user-menu.pom.ts              # Existing
│   ├── reservation-cart.pom.ts       # [NEW] Cart page interactions
│   └── date-picker.pom.ts            # [NEW] Date selection helpers
└── fixtures/index.ts                 # Existing auth fixtures
```

---

## Proposed Changes

### Page Object Models

#### [NEW] [reservation-cart.pom.ts](file:///e:/bystrze/Magazyn/frontend/e2e/page-objects/reservation-cart.pom.ts)

Encapsulates interactions with the reservation cart and checkout flow:

```typescript
class ReservationCartPOM {
  // Locators
  cartView: Locator;          // data-testid="reservation-cart"
  cartItems: Locator;         // [data-testid^="cart-item-"]
  datePickerStart: Locator;   // data-testid="date-picker-start"
  datePickerEnd: Locator;     // data-testid="date-picker-end"
  totalCost: Locator;         // data-testid="reservation-total-cost"
  confirmButton: Locator;     // data-testid="confirm-reservation-button"
  
  // Methods
  async removeItem(equipmentId: string): Promise<void>;
  async setDates(start: string, end: string): Promise<void>;
  async getTotalCost(): Promise<number>;
  async getItemCount(): Promise<number>;
  async confirm(): Promise<void>;
  async waitForSuccess(): Promise<void>;
}
```

#### [NEW] [date-picker.pom.ts](file:///e:/bystrze/Magazyn/frontend/e2e/page-objects/date-picker.pom.ts)

Helper for date picker interactions (handles calendar widget):

```typescript
class DatePickerPOM {
  async selectDate(date: Date): Promise<void>;
  async getSelectedDate(): Promise<string>;
  async isDateDisabled(date: Date): Promise<boolean>;
}
```

---

### Test File

#### [NEW] [reservation-creation.spec.ts](file:///e:/bystrze/Magazyn/frontend/e2e/reservation-creation.spec.ts)

```typescript
import { test, expect } from './fixtures';
import { ReservationCartPOM } from './page-objects/reservation-cart.pom';

/**
 * Reservation creation e2e tests.
 * Covers the complete workflow from equipment selection to reservation finalization.
 * 
 * @see fixtures/index.ts for authentication implementation
 */
```

---

## Test Cases

### 1. Equipment Selection (US-009)

| Test | Description | Key Assertions |
|------|-------------|----------------|
| `should add single item to cart` | Click "Add to Cart" on equipment | Cart indicator visible, count = 1 |
| `should add multiple items to cart` | Add 2+ items sequentially | Cart count matches items added |
| `should display cart with all selected items` | Navigate to cart page | All added items visible with details |
| `should remove items from cart` | Click remove on cart item | Item removed, count updates |
| `should show total cost for all items` | View cart with items | Total cost displayed (= sum of per-item costs) |

---

### 2. Date Selection (US-010)

| Test | Description | Key Assertions |
|------|-------------|----------------|
| `should allow selecting start date` | Open date picker, select date | Start date input shows selected date |
| `should allow selecting end date` | Select end date after start | End date input shows selected date |
| `should calculate days between dates` | Select 3-day range | Shows "3 days" or equivalent |
| `should update cost when dates change` | Change date range | Total cost updates dynamically |
| `should apply same dates to all cart items` | Set dates with multiple items | All items show same date range |

---

### 3. Validation (US-010, US-042)

| Test | Description | Key Assertions |
|------|-------------|----------------|
| `should prevent start date in the past` | Attempt to select past date | Date disabled or error shown |
| `should prevent end date before start date` | Select end < start | Error: "End date must be after start date" |
| `should require both dates before proceeding` | Click confirm without dates | Error or disabled button |
| `should show clear validation messages` | Submit with invalid data | Specific error messages visible |

---

### 4. Availability Check (US-011)

| Test | Description | Key Assertions |
|------|-------------|----------------|
| `should check user credit balance` | View cart with high-cost items | Shows required vs available credits |
| `should prevent reservation with insufficient credits` | Attempt to confirm | Error: "Insufficient credits", button disabled |
| `should show availability status for dates` | Select dates for items | Each item shows availability indicator |

---

### 5. Confirmation Screen (US-012)

| Test | Description | Key Assertions |
|------|-------------|----------------|
| `should display confirmation summary` | Proceed to confirmation | Shows all items, dates, costs |
| `should show current and remaining credit balance` | View confirmation | "Current: X, After: Y" visible |
| `should allow canceling before finalization` | Click cancel/back | Returns to cart, no changes |
| `should require explicit confirmation` | View confirmation screen | "Confirm" button requires click |

---

### 6. Finalization (US-013)

| Test | Description | Key Assertions |
|------|-------------|----------------|
| `should create reservations on confirm` | Complete full flow | Success message, redirect to reservations |
| `should deduct credits immediately` | Check balance after confirm | Balance reduced by total cost |
| `should show reservations with PENDING status` | Navigate to reservation list | New reservations visible, status = PENDING |
| `should clear cart after successful reservation` | Return to equipment page | Cart indicator hidden or count = 0 |

---

### 7. Conflict Handling (US-046, US-050)

> [!NOTE]
> Conflict tests create a reservation first, then attempt to reserve the same item for overlapping dates.

| Test | Description | Setup | Key Assertions |
|------|-------------|-------|----------------|
| `should prevent self-conflict on same dates` | User reserves item A, then tries to reserve item A again for same dates | Create reservation in test | Error: dates unavailable |
| `should prevent self-conflict on overlapping dates` | Reserve item for days 7-10, attempt days 8-12 | Create reservation in test | Error with conflicting dates shown |
| `should allow reservation after non-overlapping dates` | Reserve item for days 7-10, reserve same item for days 15-18 | Create reservation in test | Second reservation succeeds |
| `should prevent conflict from another user` | User 1 reserves item, User 2 attempts same dates | Use `secondAuthenticatedPage` | Error for User 2 |
| `should show conflicting date information` | View conflict error details | Create conflict | Shows which dates are unavailable |
| `should allow back-to-back reservations` | Reserve days 7-10, then 11-14 | Create reservation in test | Second reservation succeeds (end = next start is OK) |

#### Conflict Test Example

```typescript
test.describe('Reservation Conflicts', () => {
  let createdReservationIds: string[] = [];

  test.afterEach(async ({ supabaseAdmin }) => {
    // Cleanup: Cancel all created reservations and refund credits
    for (const id of createdReservationIds) {
      await supabaseAdmin
        .from('reservations')
        .update({ status: 'DENIED' })
        .eq('id', id);
    }
    createdReservationIds = [];
  });

  test('should prevent self-conflict on same dates', async ({ authenticatedPage }) => {
    // 1. Create first reservation
    await createReservation(authenticatedPage, 'equipment-1', 7, 10);
    // Store ID for cleanup
    createdReservationIds.push(await getLastReservationId(authenticatedPage));
    
    // 2. Attempt same item and dates
    await addToCart(authenticatedPage, 'equipment-1');
    await setDates(authenticatedPage, 7, 10);
    await authenticatedPage.getByTestId('confirm-reservation-button').click();
    
    // 3. Verify conflict error
    await expect(authenticatedPage.getByTestId('error-reservation-conflict')).toBeVisible();
  });
});
```

---

### 8. Date Modification After Reservation (US-016, US-047)

> [!IMPORTANT]
> User can only modify dates on their own PENDING reservations. Tests verify both happy path and edge cases.

| Test | Description | Setup | Key Assertions |
|------|-------------|-------|----------------|
| `should modify dates on pending reservation` | Change dates from 7-10 to 8-12 | Create PENDING reservation | Dates updated, new cost shown |
| `should recalculate credits on date change` | Extend reservation by 2 days | Create PENDING reservation | Additional credits deducted |
| `should refund credits when shortening dates` | Reduce from 7-14 to 7-10 | Create PENDING reservation | Credits refunded |
| `should warn on significant extension` | Extend by >50% or >3 days | Create PENDING reservation | Warning displayed (US-047) |
| `should prevent modification to conflicting dates` | Change to dates already reserved | Create 2 reservations | Error: dates unavailable |
| `should prevent modification on RENTED status` | Attempt to modify rented item | Admin changes status to RENTED | Modification disabled/forbidden |
| `should check availability for new dates` | Modify to dates reserved by other user | Use `secondAuthenticatedPage` | Error: conflict with other reservation |

#### Date Modification Test Example

```typescript
test.describe('Reservation Date Modification', () => {
  let reservationId: string;

  test.beforeEach(async ({ authenticatedPage, supabaseAdmin }) => {
    // Create a PENDING reservation for modification tests
    await createReservation(authenticatedPage, 'equipment-1', 7, 10);
    reservationId = await getLastReservationId(authenticatedPage);
  });

  test.afterEach(async ({ supabaseAdmin }) => {
    // Cancel reservation and refund
    if (reservationId) {
      await supabaseAdmin
        .from('reservations')
        .update({ status: 'DENIED' })
        .eq('id', reservationId);
    }
  });

  test('should modify dates on pending reservation', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/reservations/${reservationId}`);
    await authenticatedPage.getByTestId('edit-dates-button').click();
    
    // Change dates
    await setDates(authenticatedPage, 8, 12);
    await authenticatedPage.getByTestId('save-dates-button').click();
    
    // Verify update
    await expect(authenticatedPage.getByTestId('reservation-start-date')).toContainText('8');
    await expect(authenticatedPage.getByTestId('reservation-end-date')).toContainText('12');
  });

  test('should warn on significant extension', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/reservations/${reservationId}`);
    await authenticatedPage.getByTestId('edit-dates-button').click();
    
    // Extend significantly (>3 days)
    await setDates(authenticatedPage, 7, 17); // +7 days
    
    // Verify warning appears
    await expect(authenticatedPage.getByTestId('extension-warning')).toBeVisible();
    await expect(authenticatedPage.getByTestId('extension-warning')).toContainText('significantly');
  });
});
```

---

### 9. Multi-User Conflict Scenarios

Tests requiring two authenticated users to verify concurrent access and conflicts:

| Test | Description | Key Assertions |
|------|-------------|----------------|
| `should prevent User 2 from reserving User 1's dates` | User 1 reserves item, User 2 attempts same | User 2 sees conflict error |
| `should allow User 2 to see User 1's reservation in all reservations view` | User 1 creates reservation | User 2 can view in "All Reservations" tab |
| `should prevent User 2 from modifying User 1's reservation` | User 1 creates reservation | User 2 gets 403 on modification attempt |

```typescript
test('should prevent User 2 from reserving User 1 dates', async ({ 
  authenticatedPage, 
  secondAuthenticatedPage 
}) => {
  // User 1 creates reservation
  await createReservation(authenticatedPage, 'equipment-1', 7, 10);
  
  // User 2 attempts same dates
  await addToCart(secondAuthenticatedPage, 'equipment-1');
  await setDates(secondAuthenticatedPage, 7, 10);
  await secondAuthenticatedPage.getByTestId('confirm-reservation-button').click();
  
  // User 2 should see conflict error
  await expect(secondAuthenticatedPage.getByTestId('error-reservation-conflict')).toBeVisible();
});
```

---

### 10. Complete Flow (Happy Path)

| Test | Description |
|------|-------------|
| `should complete full reservation flow` | Add 2 items → Set dates (3 days) → Confirm → Verify reservations created |

```typescript
test('should complete full reservation flow', async ({ authenticatedPage }) => {
  // 1. Add items to cart
  await authenticatedPage.goto('/equipment');
  await authenticatedPage.getByTestId('equipment-add-to-cart-...').first().click();
  await authenticatedPage.getByTestId('equipment-add-to-cart-...').nth(1).click();
  
  // 2. Navigate to cart
  await authenticatedPage.getByTestId('cart-indicator').click();
  await expect(authenticatedPage.getByTestId('reservation-cart')).toBeVisible();
  
  // 3. Select dates
  const cart = new ReservationCartPOM(authenticatedPage);
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 7);
  const endDate = new Date(futureDate);
  endDate.setDate(endDate.getDate() + 3);
  
  await cart.setDates(futureDate.toISOString(), endDate.toISOString());
  
  // 4. Verify cost
  const totalCost = await cart.getTotalCost();
  expect(totalCost).toBeGreaterThan(0);
  
  // 5. Confirm
  await cart.confirm();
  await cart.waitForSuccess();
  
  // 6. Verify reservations
  await expect(authenticatedPage).toHaveURL(/\/reservations/);
  const reservations = authenticatedPage.locator('[data-testid^="reservation-row-"]');
  expect(await reservations.count()).toBeGreaterThanOrEqual(2);
});
```

---

## Test Helpers

### Helper Functions (in `e2e/helpers/reservation.helper.ts`)

```typescript
/**
 * Helper functions for reservation E2E tests.
 * Provides setup, teardown, and common actions.
 */

/** Clear the cart via localStorage */
export async function clearCart(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('magazyn-cart');
  });
  await page.reload();
}

/** Add equipment to cart */
export async function addToCart(page: Page, equipmentId: string): Promise<void> {
  await page.goto('/equipment');
  await page.getByTestId(`equipment-add-to-cart-${equipmentId}`).click();
  await expect(page.getByTestId('cart-indicator')).toBeVisible();
}

/** Set reservation dates (days from now) */
export async function setDates(page: Page, startDays: number, endDays: number): Promise<void> {
  const start = new Date();
  start.setDate(start.getDate() + startDays);
  const end = new Date();
  end.setDate(end.getDate() + endDays);
  
  await page.getByTestId('date-picker-start').fill(start.toISOString().split('T')[0]);
  await page.getByTestId('date-picker-end').fill(end.toISOString().split('T')[0]);
}

/** Create a reservation (full flow) */
export async function createReservation(
  page: Page, 
  equipmentId: string, 
  startDays: number, 
  endDays: number
): Promise<void> {
  await addToCart(page, equipmentId);
  await page.getByTestId('cart-indicator').click();
  await setDates(page, startDays, endDays);
  await page.getByTestId('confirm-reservation-button').click();
  await expect(page.getByTestId('reservation-success-message')).toBeVisible();
}

/** Get the ID of the most recently created reservation */
export async function getLastReservationId(page: Page): Promise<string> {
  await page.goto('/reservations');
  const firstRow = page.locator('[data-testid^="reservation-row-"]').first();
  const testId = await firstRow.getAttribute('data-testid');
  return testId?.replace('reservation-row-', '') ?? '';
}

/** Cancel a reservation via API using supabaseAdmin */
export async function cancelReservation(
  supabaseAdmin: SupabaseClient, 
  reservationId: string
): Promise<void> {
  await supabaseAdmin
    .from('reservations')
    .update({ status: 'DENIED' })
    .eq('id', reservationId);
}

/** Restore user credits to a specific amount */
export async function restoreCredits(
  supabaseAdmin: SupabaseClient, 
  userId: string, 
  amount: number = 100
): Promise<void> {
  await supabaseAdmin
    .from('profiles')
    .update({ credit_balance: amount })
    .eq('id', userId);
}
```

---

## Required Test IDs

The following `data-testid` attributes are required in UI components:

### Cart Components
| Component | Test ID |
|-----------|---------|
| Cart Page Container | `reservation-cart` |
| Cart Item (per equipment) | `cart-item-{equipmentId}` |
| Remove Item Button | `cart-item-remove-{equipmentId}` |
| Total Cost Display | `reservation-total-cost` |
| Credit Balance | `reservation-credit-balance` |
| Remaining Balance | `reservation-remaining-balance` |
| Confirm Button | `confirm-reservation-button` |

### Date Picker
| Component | Test ID |
|-----------|---------|
| Start Date Input | `date-picker-start` |
| End Date Input | `date-picker-end` |
| Date Validation Error | `date-validation-error` |

### Confirmation
| Component | Test ID |
|-----------|---------|
| Confirmation Modal/Screen | `reservation-confirmation` |
| Cancel Button | `cancel-reservation-button` |
| Success Message | `reservation-success-message` |

### Reservation List
| Component | Test ID |
|-----------|---------|
| Reservation Row | `reservation-row-{reservationId}` |
| Status Badge | `reservation-status-{reservationId}` |

### Reservation Details (for Date Modification)
| Component | Test ID |
|-----------|---------|
| Edit Dates Button | `edit-dates-button` |
| Save Dates Button | `save-dates-button` |
| Start Date Display | `reservation-start-date` |
| End Date Display | `reservation-end-date` |
| Extension Warning | `extension-warning` |
| Credit Adjustment Display | `credit-adjustment` |

### Errors
| Component | Test ID |
|-----------|---------|
| Insufficient Credits Error | `error-insufficient-credits` |
| Conflict Error | `error-reservation-conflict` |

---

## Verification Plan

### Automated Tests

Run all E2E tests:
```bash
cd frontend && npm run e2e -- reservation-creation.spec.ts
```

Run with UI mode for debugging:
```bash
cd frontend && npm run e2e:ui
```

### Manual Verification

After tests pass, manually verify:

1. **Credit Deduction**: Check database `profiles.credit_balance` after reservation
2. **Reservation List**: Verify new reservations appear in `/reservations` with correct data
3. **Email Notification**: (If enabled) Check test inbox for confirmation email

---

## Implementation Order

1. **Add missing `data-testid` attributes** to cart and confirmation components
2. **Create Page Object Models**: `reservation-cart.pom.ts`, `date-picker.pom.ts`
3. **Implement test file** `reservation-creation.spec.ts`:
   - Start with "happy path" complete flow test
   - Add individual story tests
   - Add validation/error tests
4. **Run and iterate** until all tests pass
5. **Document** any new test patterns in `e2e-testing.md`

---

## Related Documentation

- [Reservation Workflow](file:///e:/bystrze/Magazyn/documentation/workflows/reservation-workflow.md)
- [E2E Testing Guide](file:///e:/bystrze/Magazyn/frontend/docs/e2e-testing.md)
- [Equipment Tests](file:///e:/bystrze/Magazyn/frontend/e2e/equipment.spec.ts)
