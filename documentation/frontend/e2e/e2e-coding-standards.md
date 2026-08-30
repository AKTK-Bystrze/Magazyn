# E2E Coding Standards

Technical guidance for implementing E2E tests in the Magazyn application.

---

## Test Data Strategy

We use a **Hybrid Strategy** to balance performance and reliability:

### 1. Worker-Isolated Users (Performance & Reliability)
*   **Strategy**: Create and reuse a unique test user per worker thread (e.g., `test.user.0@example.com`, `test.user.1@example.com`).
*   **Why**: Completely isolates user state (like credit balances) between concurrent tests, preventing flakiness without the extreme overhead of creating a new user for *every single test*.
*   **Management**: The generic `testUser`, `adminUser`, and `superAdminUser` fixtures ensure these users exist for each worker.
*   **Risk**: Still shares state across sequential tests running on the *same* worker.
*   **Mitigation**: Tests must explicitly **reset relevant user state** (like credits) in `beforeEach` or `afterEach` if they modify it.

### 2. Isolated Resources (Reliability)
*   **Strategy**: Create fresh, unique resources (Equipment, Reservations) for *every* test that needs them.
*   **Why**: Prevents race conditions in parallel execution.
*   **Implementation**: Use the `testEquipment` fixture. It creates 2 unique items for the worker and deletes them afterwards.
*   **Guidance**: **Never** hardcode equipment IDs in tests. Always use the IDs provided by the `testEquipment` fixture.
*   **Auto-Seeding**: The `testEquipment` fixture automatically creates default equipment types (`kayak`, `paddle`) if they don't exist, making tests fully self-contained.

### 3. Database State
*   **Strategy**: Use `supabaseAdmin` (Admin API) for setup/teardown, NOT the UI.
*   **Why**: API is faster and less flaky than UI interactions for prerequisite data.

---

## Test Structure

```
frontend/e2e/
├── tests/                   # Test files organized by feature
│   ├── auth/                # Authentication tests
│   ├── equipment/           # Equipment feature tests
│   └── reservation-creation.spec.ts
├── fixtures/                # Test fixtures (authenticatedPage, testEquipment)
├── page-objects/            # Page Object Models
├── helpers/                 # Helper functions
│   ├── data-setup.helper.ts # Equipment creation/cleanup
│   └── reservation.helper.ts
└── constants/               # Shared constants
    ├── test-ids.ts          # Centralized data-testid values
    └── config.ts            # Single source of truth for timeouts, user creds, and global defaults
```

---

## Fixtures & Optimization

### Core Fixtures

| Fixture | Scope | Description | Cost/Optimization |
|---------|-------|-------------|-------------------|
| `page` | test | Standard Playwright page (no auth) | Low |
| `authenticatedPage` | test | Page with injected Supabase session | **High** (Performs login). Use only for protected routes. |
| `supabaseAdmin` | test | Supabase admin client | Low (Service creation only). |
| `testUser` | test | Test user info (id, email) | **Medium** (Checks DB existence). |
| `testEquipment` | test | [Equip1, Equip2] dedicated resources | **High** (DB Inserts/Deletes). **Lazy-loaded**: Only requested if argument is present. |
| `workerIndex` | worker | Worker ID for isolation | Zero |

### 🔍 Optimization Tips

1.  **Lazy Instantiation**: Fixtures are only created if you request them in the test function arguments.
    *   ✅ **Fast**: `test('landing page', async ({ page }) => { ... })` (No auth, no DB setup)
    *   ⚠️ **Slower**: `test('dashboard', async ({ authenticatedPage }) => { ... })` (Performs login)
    *   🛑 **Slowest**: `test('reservation', async ({ authenticatedPage, testEquipment }) => { ... })` (Login + DB Inserts)

2.  **Grouping**: Group tests that need similar heavy setup if possible, although Playwright's parallel execution model encourages isolation over sharing.

3.  **Conditional Logic**: Use `test.skip()` early if prerequisites aren't met to avoid wasting resources on doomed tests.

### Usage Example

```typescript
import { test, expect } from '../../fixtures';
import { TEST_IDS } from '../../constants';

test('protected page access', async ({ authenticatedPage }) => {
  // authenticatedPage implies \"I need a logged-in user\"
  await authenticatedPage.goto('/equipment');
  await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();
});
```

### Worker-Isolated Equipment

For tests that need dedicated equipment (to avoid conflicts in parallel execution):

```typescript
// Requests 'testEquipment', so it will be created and cleaned up automatically
test('reservation flow', async ({ authenticatedPage, testEquipment, workerIndex }) => {
  const [equip1, equip2] = testEquipment;
  
  // Use testEquipment IDs - each worker gets unique equipment
  await addToCart(authenticatedPage, equip1.id);
  await addToCart(authenticatedPage, equip2.id);
  
  console.log(`[Worker ${workerIndex}] Using equipment: ${equip1.id}, ${equip2.id}`);
});
```

> [!NOTE]
> `testEquipment` is created in `beforeEach` and cleaned up (including any reservations) in `afterEach`.

---

## Writing New Tests

### Rules

#### 1. Use `TEST_IDS` Constants

Always use constants from `e2e/constants/test-ids.ts` instead of hardcoded strings.

```typescript
// ✅ GOOD
import { TEST_IDS } from '../../constants';
await page.getByTestId(TEST_IDS.LOGIN_BUTTON).click();

// ❌ BAD
await page.getByTestId('login-button').click();
```

#### 2. Configuration Management

**Never use magic numbers or strings.** Use `E2E_CONFIG` from `e2e/constants/config.ts` for timeouts, default values, and test data.

```typescript
// ✅ GOOD
import { E2E_CONFIG } from '../../constants';
await expect(el).toBeVisible({ timeout: E2E_CONFIG.TIMEOUT.ASSERTION });

// ❌ BAD
await expect(el).toBeVisible({ timeout: 5000 });
```

#### 3. Use Proper Assertions

Use Playwright's built-in `expect` assertions with auto-retry.

```typescript
// ✅ GOOD - Auto-retrying assertions
await expect(page.getByTestId(TEST_IDS.USER_MENU)).toBeVisible();

// ❌ BAD - Manual boolean checks
const isVisible = await page.getByTestId('menu').isVisible();
expect(isVisible).toBeTruthy();
```

#### 4. Import from Local Fixtures

Always import `test` and `expect` from `../../fixtures`, not from `@playwright/test`.

```typescript
// ✅ GOOD
import { test, expect } from '../../fixtures';

// ❌ BAD
import { test, expect } from '@playwright/test';
```

#### 5. Use `testEquipment` for Cart/Reservation Tests
 
For tests that add items to cart or create reservations, use the worker-isolated `testEquipment` fixture. This aligns with our [Test Data Strategy](#test-data-strategy) (Isolated Resources).
 
**Performance Note**: Requesting this fixture triggers DB inserts/deletes. Do not request it for read-only tests.
 
```typescript
test('cart functionality', async ({ authenticatedPage, testEquipment }) => {
  const [equip1] = testEquipment;
   
  // This equipment is unique to this worker - no conflicts
  await addToCart(authenticatedPage, equip1.id);
});
```

#### 6. Handle Optional Elements Gracefully

Use `.catch(() => false)` for elements that may not exist.

```typescript
const hasFeature = await page.getByTestId(TEST_IDS.OPTIONAL_FEATURE).isVisible().catch(() => false);

if (!hasFeature) {
  test.skip();
  return;
}
```

#### 7. Documentation Standards

*   **Strictly NO inline comments.** Code should be self-documenting.
*   **Mandatory TSDoc** for:
    *   All exported helper functions (param/return/throws tags).
    *   All Page Object Model methods.
    *   Test description blocks (`test.describe`).
    *   Complex test scenarios (JSDoc).

```typescript
/**
 * Adds an item to the cart and verifies visibility.
 *
 * @param page - The Playwright page instance.
 * @param equipmentId - The ID of the item to add.
 * @throws Error if the add button is not found.
 */
export async function addToCart(page: Page, equipmentId: string): Promise<void> {
  // ...
}
```

---

### Test Template

Use this template when creating new test files:

```typescript
import { test, expect } from '../../fixtures';
import { TEST_IDS } from '../../constants';

/**
 * [Feature Name] e2e tests.
 * [Brief description of what these tests cover]
 *
 * Uses worker-isolated fixtures for parallel execution.
 */
test.describe('[Feature Name]', () => {
  test('should [expected behavior]', async ({ authenticatedPage, testEquipment, workerIndex }) => {
    // Arrange - Navigate to page
    await authenticatedPage.goto('/feature-page');

    // Act - Perform action (use testEquipment if modifying cart/reservations)
    const [equip1] = testEquipment;
    await authenticatedPage.getByTestId(`action-button-${equip1.id}`).click();

    // Assert - Verify result
    await expect(authenticatedPage.getByTestId(TEST_IDS.RESULT_CONTAINER)).toBeVisible();
    
    console.log(`[Worker ${workerIndex}] ✅ Test completed`);
  });
});
```

---

### Naming Conventions

| Item | Convention | Example |
|------|------------|---------|
| Test file | `tests/<feature>/<name>.spec.ts` | `tests/equipment/browsing.spec.ts` |
| Test describe block | Feature name | `'Equipment Browsing'` |
| Test name | `should + behavior` | `'should display equipment grid'` |
| Constant key | `UPPER_SNAKE_CASE` | `TEST_IDS.EQUIPMENT_GRID` |

---

## Parallel Execution

Tests run fully parallel with worker isolation:

- **Each worker** gets its own `testEquipment` (2 equipment items)
- **Equipment is created** before each test, **deleted** after each test
- **Shared test user** is reused across all workers (no conflicts)
- **Valid reservations** must use `calculateWorkerDates(workerIndex)` to avoid data grouping collisions

```bash
# Run with 4 parallel workers
npm run e2e -- --workers=4
```

---

## Dev Toolbar Configuration

The Astro dev toolbar is automatically disabled during E2E tests to prevent it from intercepting pointer events. This is configured in `astro.config.mjs`:

```javascript
devToolbar: {
  enabled: process.env.E2E_TESTING !== 'true',
}
```

Playwright sets `E2E_TESTING=true` when starting the dev server, ensuring the toolbar doesn't interfere with test interactions while remaining available during regular development.
