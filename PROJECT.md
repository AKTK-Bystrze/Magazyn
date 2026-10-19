# Project: Test Hardening & Correction Mission

## Architecture
- **Backend Test Suite (Go)**:
  - Integration & Unit tests under `backend/internal/service/*/*_test.go`
  - Integration tests use build tag `//go:build integration` with live Supabase client.
- **Frontend Vitest Suite (TypeScript / React 19 / Vite)**:
  - Unit and component tests under `frontend/src/**/*.test.ts*` and `__tests__/*.tsx`
  - Runs with `npx.cmd vitest run` via jsdom.
- **Frontend Playwright E2E Suite (TypeScript / Playwright)**:
  - E2E tests under `frontend/e2e/tests/**/*.spec.ts`
  - Helper libraries in `frontend/e2e/helpers/` and fixtures in `frontend/e2e/fixtures/`
  - Runs with `npx playwright test` targeting live frontend and backend.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Credit History Admin Assertion | Remove failure-swallowing `t.Skip` in `credit_integration_test.go` and assert non-empty history and admin adjustment entry | M1 | Survey (Backend) |
| 2 | Auth Login Determinism | Remove `t.Skip` on Supabase 400 in `auth_service_integration_test.go`, create real user, assert explicit outcomes | M1 | Survey (Backend) |
| 3 | Realistic Credit Balances | Replace artificial 100,000 credit balances in `reservation_integration_fixture_test.go` and `reservation_integration_rpc_test.go` with realistic balances (10) and `setUserBalance` helper | M1 | Survey (Backend) |
| 4 | Return Under Deficit & Boundary | Add tests in `reservation_integration_return_test.go` for zero balance, negative balance, and late return date extension | M1 | Survey (Backend) |
| 5 | Cart Date Boundaries | Add tests in `cart-validation.test.ts` for same-day (`futureDate(0)`), backwards dates, and timezone boundaries | M2 | Survey (Frontend) |
| 6 | Future Reservation Status | Update `ReservationTableRow.test.tsx` to assert `"Przyszła"` instead of `"W trakcie"` for future reservations | M2 | Survey (Frontend) |
| 7 | User Status Filter Tests | Add test cases in `UserFilters.test.tsx` asserting presence and interaction of user status filter | M2 | Survey (Frontend) |
| 8 | Credit Request Form Tests | Create `CreditRequestForm.test.tsx` testing user selection dropdown and helper checkbox toggling | M2 | Survey (Frontend) |
| 9 | Live Credit History E2E | Eliminate all `page.route` mocks in `history.spec.ts` using live backend and DB test helpers | M3 | Survey (E2E) |
| 10 | Dedicated Session Isolation | Add dedicated test in `login.spec.ts` testing Issue #23 (same-window multi-user switching via UI without cookie/storage clearing) | M3 | Survey (E2E) |
| 11 | Session Context Isolation | Confirm and maintain separate isolated browser contexts for all general workflow tests | M3 | Survey (E2E) |
| 12 | Equipment CRUD UI & Debt Removal | Remove `// ponytail: DEBT` in `admin/equipment.spec.ts` and drive complete create, edit, status change, and archive via UI dialogs | M3 | Survey (E2E) |
| 13 | Reactive Cart Reservation E2E | Add sequential back-to-back reservations purely through UI cart in `reservation-creation.spec.ts` to verify reactive credit updates without reloads | M3 | Survey (E2E) |
| 14 | Polish Localization Assertions | Replace all bilingual regexes (`/equipment|sprzęt/i`, `/Anulowan[ao]|Cancelled/i`) with strict Polish strings | M3 | Survey (E2E) |
| 15 | Test-Only Scope Enforcement | Ensure zero application source files are modified; `git diff --name-only` touches only tests, fixtures, and test helpers | M4 | Survey (Cross-cutting) |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Backend Go Tests Hardening | Features 1, 2, 3, 4: Go integration tests in credit, auth, and reservation services | none | DONE |
| M2 | Frontend Vitest Tests Hardening | Features 5, 6, 7, 8: Vitest unit & component tests in cart, reservations, users, credits | none | DONE |
| M3 | Playwright E2E Hardening & Session Isolation | Features 9, 10, 11, 12, 13, 14: Pure UI E2E tests, no mocks, same-session isolation, equipment CRUD | none | DONE |
| M4 | Multi-Agent Review, Adversarial Challenge & Forensic Audit | Feature 15: Independent verification, adversarial stress testing, and forensic audit of test-only constraint | M1, M2, M3 | DONE |

## Interface Contracts
- **Test Helpers ↔ Playwright Tests**: `frontend/e2e/helpers/data-setup.helper.ts` provides `seedCreditHistory` and `clearCreditHistory` using `supabaseAdmin`.
- **Fixtures ↔ Go Integration Tests**: `dateTestFixture` in `reservation_integration_fixture_test.go` provides `setUserBalance(userID string, balance int32)` to set exact balances.
- **Frontend Test Utils ↔ Component Tests**: `@testing-library/react` and Vitest `vi.mock` for `@/lib/api` in `CreditRequestForm.test.tsx`.

## Code Layout
- Backend test files:
  - `backend/internal/service/credit/credit_integration_test.go`
  - `backend/internal/service/auth/auth_service_integration_test.go`
  - `backend/internal/service/reservation/reservation_integration_fixture_test.go`
  - `backend/internal/service/reservation/reservation_integration_rpc_test.go`
  - `backend/internal/service/reservation/reservation_integration_return_test.go`
- Frontend Vitest test files:
  - `frontend/src/lib/utils/cart-validation.test.ts`
  - `frontend/src/components/reservations/__tests__/ReservationTableRow.test.tsx`
  - `frontend/src/components/users/__tests__/UserFilters.test.tsx`
  - `frontend/src/components/credits/__tests__/CreditRequestForm.test.tsx`
- Playwright E2E test files:
  - `frontend/e2e/tests/credits/history.spec.ts`
  - `frontend/e2e/tests/auth/login.spec.ts`
  - `frontend/e2e/tests/admin/equipment.spec.ts`
  - `frontend/e2e/tests/reservation-creation.spec.ts`
  - `frontend/e2e/tests/admin/reservation-management.spec.ts`
  - `frontend/e2e/tests/admin/reservation-filters.spec.ts`
  - `frontend/e2e/helpers/data-setup.helper.ts`
- Scope Boundary:
  - Strictly no modifications to application source files (any file outside test files, test fixtures, test helpers).
