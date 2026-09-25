# Frontend Testing Standards

## 1. Unit Testing (Vitest)
- **DO**: Use `vi.fn()`, `vi.spyOn()`, and `vi.stubGlobal()` for test doubles.
- **DO**: Place mock factory functions at the top level of the test file.
- **DO**: Use `expect(value).toMatchInlineSnapshot()` for readable assertions.
- **DO**: Configure `environment: 'jsdom'` for frontend component tests and use testing-library utilities.

## 2. E2E Testing (Playwright)
- **Hybrid Test Data Strategy**:
  - Use worker-isolated generic users (`testUser`, `adminUser`, `superAdminUser`) to balance speed and reliability without recreating users for every test.
  - Reset relevant user states in `beforeEach` or `afterEach`.
  - Use isolated resources via the `testEquipment` fixture for every test that mutates state to prevent race conditions.
  - Setup prerequisites using the `supabaseAdmin` API instead of the UI for faster data seeding.
- **DO**: Use auto-retrying built-in assertions (`expect(page.locator).toBeVisible()`).
- **DO**: Import test utilities from local fixtures (`import { test, expect } from '../../fixtures'`).
- **DON'T**: Hardcode timeouts or magic strings. Use `E2E_CONFIG` and `TEST_IDS` from `constants`.

## 3. UI Selectors Convention
- **DO**: Use semantic `data-testid` attributes in `kebab-case` for Playwright testing. Format: `{feature}-{element}-{variant?}`.
  - Examples: `equipment-search-input`, `login-submit-button`, `equipment-row-{id}`.
- **DO**: Place selectors explicitly inside the target components, not on parent wrappers.
- **Primary Strategy**:
  1. `data-testid` for containers, forms, and interactive elements.
  2. `getByRole()` for semantic HTML elements.
  3. `getByText()` as fallback for static labels.

## 4. Local CI Simulation for E2E
To run Playwright locally identical to GitHub Actions:
1. Map `host.docker.internal` to `127.0.0.1` (Linux: `/etc/hosts`).
2. Point `.env` to `PUBLIC_SUPABASE_URL=http://host.docker.internal:54321`.
3. Start Supabase locally: `npx supabase start`.
4. Deploy the stack: `cd infra && docker compose --env-file ../.env up -d`.
5. Run tests locally by overriding to localhost:
   ```bash
   PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 E2E_BASE_URL=http://localhost npx playwright test --workers=4
   ```
