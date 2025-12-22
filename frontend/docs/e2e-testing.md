# E2E Testing

> **Purpose**: Configure and run end-to-end tests for the Magazyn application.

---

## Overview

Magazyn uses **Playwright** for e2e testing with **Supabase password-based authentication**. Tests authenticate using real JWT tokens obtained via `signInWithPassword` - this works even though the app UI uses magic links.

> [!IMPORTANT]
> This application is **primarily designed for mobile devices**. All E2E tests run on mobile viewport (Pixel 5: 393x851).

---

## Quick Start

### 1. Configure Environment

Add to **root `.env`**:

```bash
# Supabase (likely already set)
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-anon-key>

# E2E Testing (required)
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>  # Supabase → Settings → API → Service Role
E2E_TEST_EMAIL=<test-user-email>
E2E_TEST_PASSWORD=<password>  # Optional, default: 'TestSecurePassword123!'
E2E_BASE_URL=http://localhost:4321  # Optional
```

> [!CAUTION]
> Keep `SUPABASE_SERVICE_ROLE_KEY` secret! Never commit to git.

### 2. Ensure Test User Profile

Run in Supabase SQL Editor:

```sql
INSERT INTO profiles (id, email, role, is_enabled, username, credit_balance)
SELECT id, email, 'user', true, 'e2e-tester', 100
FROM auth.users WHERE email = '<E2E_TEST_EMAIL>'
ON CONFLICT (id) DO UPDATE SET is_enabled = true;
```

### 3. Run Tests

```bash
# Terminal 1: Backend
cd backend && go run cmd/api/main.go

# Terminal 2: Run tests (starts frontend automatically)
cd frontend && npm run e2e
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant Test as Playwright Test
    participant Supabase as Supabase Admin API
    participant Browser

    Test->>Supabase: Create/update user (service key)
    Test->>Supabase: signInWithPassword
    Supabase-->>Test: access_token, refresh_token
    Test->>Browser: Inject session (localStorage + cookies)
    Browser->>Browser: Reload page
    Test->>Browser: Navigate to protected route
```

> [!NOTE]
> Password auth works at the API level even though the app UI only shows magic links.

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
    └── config.ts            # Test configuration (timeouts, users, prefixes)
```

---

## Available Fixtures

| Fixture | Scope | Purpose |
|---------|-------|---------|
| `page` | test | Standard Playwright page (no auth) |
| `authenticatedPage` | test | Pre-authenticated page with test user session |
| `supabaseAdmin` | test | Supabase admin client for setup/teardown |
| `testUser` | test | Test user information (id and email) |
| `workerIndex` | worker | Worker index for parallel test isolation |
| `testEquipment` | test | Dedicated test equipment for this worker (2 items) |

### Usage

```typescript
import { test, expect } from '../../fixtures';
import { TEST_IDS } from '../../constants';

test('protected page access', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/equipment');
  await expect(authenticatedPage.getByTestId(TEST_IDS.EQUIPMENT_GRID)).toBeVisible();
});
```

### Worker-Isolated Equipment

For tests that need dedicated equipment (to avoid conflicts in parallel execution):

```typescript
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

#### 2. Never Use Hardcoded Timeouts

Replace `waitForTimeout()` with explicit waits or assertions.

```typescript
// ❌ BAD - Arbitrary timeout
await page.waitForTimeout(1000);

// ✅ GOOD - Wait for specific element
await expect(page.getByTestId(TEST_IDS.MODAL)).toBeVisible();
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

For tests that add items to cart or create reservations, use the worker-isolated `testEquipment` fixture:

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

#### 7. Add TSDoc Comments

Document test files and complex tests with TSDoc comments.

```typescript
/**
 * Equipment browsing e2e tests.
 * Tests the equipment listing, filtering, and cart functionality.
 *
 * @see fixtures/index.ts for authentication implementation
 */
test.describe('Equipment Browsing', () => {
  // ...
});
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

```bash
# Run with 4 parallel workers
npm run e2e -- --workers=4
```

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run e2e` | Run all e2e tests on mobile viewport |
| `npm run e2e:ui` | Run with Playwright UI |
| `npm run e2e:debug` | Run in debug mode |
| `npm run e2e -- <file>` | Run specific test file |
| `npm run e2e -- --workers=4` | Run with 4 parallel workers |

---

## CI/CD Integration

### GitHub Actions

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        working-directory: ./frontend
        run: |
          npm ci
          npx playwright install --with-deps chromium
      - name: Run E2E Tests
        working-directory: ./frontend
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          E2E_TEST_EMAIL: test@example.com
          E2E_TEST_PASSWORD: TestSecurePassword123!
        run: npm run e2e
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `Missing Supabase environment variables` | Set `SUPABASE_SERVICE_ROLE_KEY` in `.env` |
| `Failed to sign in for tokens` | Check password or enable user in Supabase |
| Redirect to `/login` | Session injection failed, check cookie format |
| Redirect to `/account-disabled` | Set `is_enabled = true` in profiles table |
| Backend timeout | Start Go API on port 8080 |
| `Conflict detected for equipment` | Use `testEquipment` fixture for isolation |

### Run Diagnostics

```bash
cd frontend && npm run e2e -- auth-diagnostic.spec.ts
```

---

## Related

- [Auth Workflow](../../documentation/workflows/auth-workflow.md)
- [Frontend Auth](./auth.md)
- [Backend Auth](../../backend/docs/auth.md)
- [E2E Refactor Plan](../../.ai/e2e-tests-all-merge.md)
