# Code Review Checklist for Magazyn

This checklist must be used when reviewing code changes (PR reviews, self-reviews, and AI assistance) to ensure compliance with project standards, monorepo architecture, security boundaries, and domain invariants.

---

## 📚 Documentation & Reference Map

Quick-reference links to authoritative project documentation:

| Domain                    | Guide & Documentation Link                                                                                                                                                                                                                                                                                         | Key Architectural Boundaries                                                                                             |
| :------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------- |
| **Commit & PR Standards** | [Conventional Commits Guide](../../documentation/overview/conventional-commits.md)                                                                                                                                                                                                                                 | PR title must follow `<type>(<scope>): <description>` for squash merge                                                   |
| **System Architecture**   | [High-Level Architecture](../../documentation/overview/high-level-architecture.md)<br/>[Detailed Architecture](../../documentation/overview/detailed-architecture.md)<br/>[Technology Stack](../../documentation/overview/techstack.md)<br/>[Project Structure](../../documentation/overview/project_structure.md) | Hybrid Light: SSR Frontend (Astro/React) + Stateless Go API + Supabase Cloud + Caddy                                     |
| **Backend Layer (Go)**    | [Backend Developer Guide](../../documentation/backend/README.md)<br/>[API Reference](../../documentation/overview/api.md)                                                                                                                                                                                          | Layered architecture (`handler` → `service` → `repository`), stdlib `net/http`, constructor injection, structured errors |
| **Frontend Layer**        | [Frontend Architecture](../../documentation/frontend/architecture.md)<br/>[Frontend Coding Guidelines](../../documentation/frontend/guidelines.md)                                                                                                                                                                 | 3-tier components (Containers → Islands → Subcomponents), BFF API proxies, Zod transformers, `ROUTES` constants          |
| **Database & Migrations** | [Database Documentation](../../documentation/database/db-doc.md)                                                                                                                                                                                                                                                   | PostgreSQL RPCs (`SECURITY DEFINER`), strict RLS on all tables, UTC migration naming                                     |
| **Application Flows**     | [Authentication Flow](../../documentation/flows/auth-flow.md)<br/>[Reservation Flow](../../documentation/flows/reservation-flow.md)<br/>[Request Flow](../../documentation/flows/reservation-request-flow.md)                                                                                                      | Magic Link auth, HttpOnly encrypted cookie (`magazyn_sid`), atomic reservation RPCs, inclusive day calculations          |
| **Testing**               | [Frontend Testing Standards](../../documentation/frontend/testing.md)<br/>[Backend Testing Guide](../../documentation/backend/README.md#6-test-infrastructure--centralized-mocks)                                                                                                                                  | Table-driven Go subtests (`t.Run`), centralized mocks, Vitest with fixtures, Playwright on mobile viewport               |
| **Observability & Ops**   | [Metrics & Observability](../../documentation/METRICS.md)<br/>[Disaster Recovery Playbook](../../documentation/operations/recovery_playbook.md)                                                                                                                                                                    | Prometheus metrics on internal `:9091`, Grafana dashboards, `./admin.sh` cockpit                                         |

---

## 1. Conventional Commits & Pull Request Standards

- [ ] **PR Title Format** - Follows Conventional Commits: `<type>(<scope>): <description>` (summarizes ALL changes for squash merge; validated via `commitlint`).
- [ ] **Allowed Types** - Uses valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.
- [ ] **Breaking Changes** - Breaking changes explicitly flagged with `!` after type (e.g., `feat!:`) or `BREAKING CHANGE:` in body/footer.
- [ ] **Description Style** - Description is lowercase, imperative, and contains no trailing period (e.g., `feat(reservation): add calendar availability check`).
- [ ] **Scope Appropriateness** - Uses recognized domain scopes: `auth`, `ui`, `backend`, `frontend`, `api`, `db`, `e2e`, `ci`, `docs`.

---

## 2. Monorepo & Directory Structure Compliance

- [ ] **Correct Directory Placement**:
  - `frontend/src/pages/` - Astro page routes and SSR BFF proxies (`frontend/src/pages/api/`).
  - `frontend/src/layouts/` - Astro layout templates.
  - `frontend/src/components/{domain}/` - Decomposed React components (Containers, Islands, Subcomponents).
  - `frontend/src/hooks/` & `frontend/src/lib/hooks/` - Custom query, mutation, and UI state hooks.
  - `frontend/src/lib/api/` - Client API modules.
  - `frontend/src/lib/transformers/` - Bidirectional data transformers (`snake_case` ↔ `camelCase`).
  - `frontend/src/lib/auth/` - `SessionStore` (AES-256-GCM) and `RedirectManager` DAG.
  - `frontend/src/lib/config/constants/` - `ROUTES`, status, role, and UI string constants.
  - `frontend/src/test/fixtures/` - Centralized test fixtures and utilities.
  - `backend/cmd/api/main.go` - Application bootstrap and dependency wireup.
  - `backend/internal/handler/{domain}/` - HTTP transport handlers and query binders (`*_query.go`).
  - `backend/internal/service/{domain}/` - Pure business logic and decomposed sub-services.
  - `backend/internal/repository/supabase/` - PostgREST data access and RPC wrappers (`*_rpc.go`).
  - `backend/internal/middleware/` - CORS, JWT validation, and RBAC middleware.
  - `backend/internal/types/` - Shared domain models and DTOs.
  - `backend/internal/validation/` - Input validation and search sanitization utilities.
  - `backend/internal/testutils/` - Centralized test mocks and request helpers.
  - `supabase/migrations/` - Versioned SQL schema changes and stored procedures.
  - `infra/` - Docker Compose, Caddyfile, Dockerfiles, and operations scripts (`admin.sh`).
- [ ] **File Naming Conventions**:
  - React Components: `PascalCase.tsx`
  - React/Astro Hooks & Utils: `camelCase.ts` or `kebab-case.ts`
  - Astro Pages & API Routes: `kebab-case.astro` or `[id].ts`
  - Go Backend Files: `snake_case.go` (tests suffixed with `_test.go` or `_integration_test.go`)
  - Supabase Migrations: `YYYYMMDDHHMMSS_short_description.sql` (UTC timestamp)

---

## 3. Backend Guidelines (Go Layered Architecture)

### Layer Boundaries & Separation of Concerns

- [ ] **Strict Layering** - Requests flow unidirectionally: `handler` → `service` → `repository`. Handlers never call repositories directly.
- [ ] **Handler Layer (`internal/handler/`)**:
  - Only handles HTTP transport (decoding JSON, query binding, status mapping).
  - Contains **zero business logic**.
  - Query parameters bound and validated using domain binders (e.g., `equipment_query.go`, `reservation_query.go`).
  - Domain errors mapped to standard HTTP status codes via `http_utils.go`.
- [ ] **Service Layer (`internal/service/`)**:
  - Pure Go business logic, independent of HTTP or database driver abstractions.
  - Decomposed into single-responsibility sub-services for complex domains (e.g., `equipment_service_availability.go`, `reservation_service_create.go`, `reservation_service_update.go`, `pricing.go`).
  - Orchestrates repositories and dispatches async side-effects (e.g., notifications).
- [ ] **Repository Layer (`internal/repository/`)**:
  - Database access abstracted behind interfaces in `internal/repository/{domain}.go`.
  - Concrete Supabase implementations in `internal/repository/supabase/`.
  - Stored procedure calls isolated in `*_repository_rpc.go`.

### Routing, Context & Dependency Injection

- [ ] **Standard Library Routing** - Uses `net/http` with `http.NewServeMux()`. No external web frameworks (Gin, Echo, Fiber).
- [ ] **Constructor Injection** - Dependencies wired explicitly via constructors (`NewReservationService(repo, ...)`); no global mutable state.
- [ ] **Context Propagation** - `context.Context` from HTTP requests propagated down through all services and repositories.
- [ ] **Detached Context for Async Tasks** - Detached context (`context.WithoutCancel(ctx)`) used for background goroutines (e.g., email notifications) so HTTP disconnects do not cancel background work.
- [ ] **Type-Safe Context Extraction** - Context values extracted in handlers with explicit type assertions:
  - `appcontext.UserContextKey` → `*types.User`
  - `appcontext.UserProfileContextKey` → `*types.PublicProfilesSelect`
  - `appcontext.AccessTokenContextKey` → `string`

### Security & Input Validation

- [ ] **PostgREST Injection Sanitization (CRITICAL)** - All search terms used in `ILIKE` queries are sanitized with `validation.SanitizeSearchTerm(term)` to escape `, . ( ) = * !`.
- [ ] **UUID Validation** - All ID path/query parameters validated with `validation.ValidateUUID()`.
- [ ] **Enum Validation** - Status and role strings validated against constants with `validation.ValidateEnum()`.
- [ ] **Date Validation** - Dates parsed and validated using Go standard `time.Parse(constants.DateFormatISO, ...)`.
- [ ] **String Length Limits** - String inputs validated with `validation.ValidateStringLength()`.
- [ ] **Authorization & RBAC** - Endpoints protected with `RequireRoles()` wrappers matching the [Auth Access Control Table](../../documentation/backend/README.md#auth-access-control-table).
- [ ] **Disabled User Quarantine** - Disabled users blocked from all endpoints except `GET /auth/session`.
- [ ] **Service Role Key Scoping** - `SUPABASE_SERVICE_ROLE_KEY` used ONLY for privileged administrative operations or background workers; standard operations use user JWT + Anon Key for RLS.

### Error Handling & Logging

- [ ] **Domain Error Types** - Services return structured types (`types.NewNotFoundError`, `types.NewConflictError`, `types.NewValidationError`).
- [ ] **Repository Error Wrapping** - Repositories wrap low-level errors with context (`fmt.Errorf("...: %w", err)`).
- [ ] **No Leaked Internals** - Internal database errors or stack traces are not leaked in HTTP response payloads.

---

## 4. Frontend Guidelines (Astro 5 + React 19 + TypeScript)

### Component Taxonomy & Decomposition (SRP)

- [ ] **Tier 1: Route Containers (`*Container.tsx`)**:
  - High-level orchestrators consuming TanStack Query hooks.
  - Coordinate dialog states via dedicated hooks (`useReservationDialogs.ts`).
  - Contain **no table rows, cards, or form markup**.
- [ ] **Tier 2: Presentation Islands (`*View.tsx`, `*Table.tsx`)**:
  - Responsible for view layouts, sorting state, responsive wrappers.
  - Delegate row and cell rendering to subcomponents.
- [ ] **Tier 3: Subcomponents & Shared Form Fields**:
  - Table rows (`ReservationTableRow.tsx`), headers (`ReservationTableHeader.tsx`), and menus (`ReservationActionMenu.tsx`) extracted to dedicated files.
  - Shared form inputs extracted into reusable field sets (`EquipmentFormFields.tsx`, `UserFormFields.tsx`, `ReservationDateAdjustmentFields.tsx`).
  - Dialogs built on Radix / Shadcn primitives with keyboard accessibility (`Esc`, focus traps).
- [ ] **Component Size Limit** - Components kept under 300 lines of code.

### Custom Hooks Taxonomy

- [ ] **Data Query Hooks** - Wrap TanStack Query `useQuery` calls with caching and typing (e.g., `useEquipmentSearch`).
- [ ] **Mutation Hooks** - Encapsulate mutations, cache invalidation, and toast feedback (e.g., `useCartCheckout`, `useReservationDateAdjustment`).
- [ ] **UI State Hooks** - Isolate modal, dialog, and interaction state (e.g., `useReservationDialogs`, `useInfiniteScrollTrigger`, `useDismissibleMessage`).

### API Proxy Pattern (BFF) & Transformers

- [ ] **No Direct Backend Calls** - React components NEVER call the Go backend directly; all client requests go to same-origin Astro SSR proxies (`/pages/api/*`).
- [ ] **BFF Proxy Handler**:
  - Reads `locals.accessToken` populated by Astro middleware.
  - Forwards requests to backend with `Authorization: Bearer <token>`.
  - Disables prerendering (`export const prerender = false`).
- [ ] **Bidirectional Transformers**:
  - Backend `snake_case` DTOs converted to frontend `camelCase` domain models using transformers in `src/lib/transformers/`.
  - Mutations convert `camelCase` payloads back to `snake_case`.
  - All input/output payloads validated with Zod schemas.

### Coding Practices & Styling

- [ ] **Route Constants** - Routes NEVER hardcoded as raw strings; use `ROUTES` constants from `src/lib/config/constants/routes.ts` (e.g., `ROUTES.PUBLIC.LOGIN`).
- [ ] **Centralized UI Strings** - UI text uses constants from `ui-strings.ts` (no inline user-facing magic strings).
- [ ] **Early Returns & Guard Clauses** - Error and precondition checks placed at the beginning of functions; happy path last; no unnecessary `else` blocks.
- [ ] **No Next.js Directives** - Never use `"use client"` or `"use server"` (Astro handles island hydration via `client:*` directives).
- [ ] **Tailwind & Shadcn Styling**:
  - Utility classes used over custom CSS; no inline `style={{ ... }}` attributes.
  - Dark mode supported using Tailwind's `dark:` variant and CSS variables.
  - Responsive design verified across mobile and desktop breakpoints.

### Authentication & Session Security

- [ ] **HttpOnly Encrypted Cookie** - Sessions managed via server-side encrypted `magazyn_sid` cookie (AES-256-GCM); tokens NEVER stored in `localStorage`.
- [ ] **Deterministic Redirect DAG** - Navigation and route protection adhere to `RedirectManager` DAG (eliminates redirect loops).
- [ ] **Source of Truth** - User roles and enabled status determined strictly from backend `sessionInfo.role`, never from client-side JWT claims.

---

## 5. Database & Supabase Guidelines

### Migrations

- [ ] **File Naming** - Named in exact UTC format: `supabase/migrations/YYYYMMDDHHMMSS_short_description.sql`.
- [ ] **Header Metadata** - Contains header comments describing purpose, affected tables, and dependencies.
- [ ] **SQL Style** - All SQL syntax written in lowercase.
- [ ] **Destructive Safety** - Copious comments and safety checks for destructive operations (`DROP`, `ALTER`, `TRUNCATE`).

### Row Level Security (RLS)

- [ ] **RLS Enabled Everywhere** - `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` applied on all tables without exception.
- [ ] **Granular Policies** - One policy per operation (`SELECT`, `INSERT`, `UPDATE`, `DELETE`), separated for `anon` and `authenticated` roles.
- [ ] **Recursion Prevention** - Admin policies use `SECURITY DEFINER` helper functions (e.g., `get_user_role()`) to prevent infinite RLS recursion.
- [ ] **User Data Isolation** - Non-admin users restricted to their own rows (`user_id = auth.uid()`).

### Stored Procedures (Atomic RPCs) & DB Logic

- [ ] **Atomic Transactions** - Critical multi-table operations implemented as PostgreSQL RPCs with `SECURITY DEFINER` and transactions:
  - `create_reservation_atomic`: Checks availability, deducts credits, inserts booking, logs to history.
  - `modify_reservation_dates_with_credits`: Recalculates cost difference, updates dates, adjusts credit balance.
  - `bulk_update_reservations_status`: Atomically transitions statuses and processes cancellation refunds.
  - `refund_reservation_credits`: Refunds credits and logs ledger transaction.
  - `create_credit_request_atomic` / `review_credit_request_atomic`: Creates or reviews credit requests and helper splits.
- [ ] **Integrity Constraints** - Booking dates protected by `end_date >= start_date` and PostgreSQL exclusion constraints (`btree_gist`) to prevent date overlaps on the same equipment.
- [ ] **Audit Triggers** - `log_reservation_changes` trigger active on `reservations`; `update_updated_at` active on timestamped tables.

---

## 6. Domain-Specific Feature Compliance

### Equipment & Inventory

- [ ] **Equipment Statuses** - Status matches enum: `ok`, `broken`, `blocked`.
- [ ] **Archived Equipment** - `is_archived = true` items excluded from public listing and new reservations.
- [ ] **Maintenance Logging** - Equipment status transitions recorded in `maintenance_logs` via the service layer.
- [ ] **Image Storage** - Equipment images referenced by relative path (`image_path`) in Supabase Storage `equipment` bucket.
- [ ] **Top Favorites Ranking** - Top 3 rented equipment items per type ranked first in search results.

### Reservations & Pricing Flow

- [ ] **Day Calculation Rule** - Uses `validation.CalculateDays(start, end)`: inclusive formula (`end - start + 1`), minimum 1 day.
- [ ] **Pricing Formula** - `Cost = Days × CreditCostPerDay` from `EquipmentType`.
- [ ] **Free Reservations** - `is_free = true` reservations charge 0 credits and skip refund transactions on cancellation/adjustment.
- [ ] **Status State Machine**:
  - `PENDING` → `RENTED` (Admin approval / equipment pickup)
  - `PENDING` → `CANCELLED` (User or Admin cancellation; triggers credit refund)
  - `PENDING` → `RETURNED` (User self-return if allowed)
  - `RENTED` → `RETURNED` (Admin confirmed return)
- [ ] **Permission Boundaries** - Regular users can only modify/cancel their **own PENDING** reservations. Non-pending reservations are immutable for regular users.

### Credit System & Ledger

- [ ] **Immutable History** - Every credit balance change creates a corresponding row in `credit_history` with an appropriate reason:
  - `reservation_charge`, `reservation_refund`, `reservation_adjustment`, `admin_adjustment`, `work_credit`.
- [ ] **Helper Distribution** - Credit requests with multiple helpers correctly record entries in `credit_request_helpers` and distribute credits atomically upon admin approval.
- [ ] **Leaderboard** - Credit totals computed via `get_credit_leaderboard` RPC.

---

## 7. Testing Standards

### Go Backend Tests

- [ ] **Table-Driven Tests** - Unit tests structured with descriptive `t.Run("scenario", func(t *testing.T) { ... })` cases.
- [ ] **Centralized Mocks** - Uses mock implementations from `backend/internal/testutils/mocks/` (no duplicate mock definitions in test files).
- [ ] **Test Request Helpers** - Uses `testutils.NewAuthenticatedRequest()` and `httptest.NewRecorder()` for handler tests.
- [ ] **Mock Assertions** - Tests verify mock interactions with `mock.AssertExpectations(t)` and negative assertions with `mock.AssertNotCalled()`.
- [ ] **Integration Test Separation** - Integration tests marked with `//go:build integration` header and follow `Test<Method>_<Scenario>_<ExpectedBehavior>` naming.
- [ ] **Fixture Teardown** - Integration tests use `setupTestFixture(t)` with `defer fixture.teardown()`. No `time.Sleep()` used for synchronization.

### Frontend Unit Tests (Vitest)

- [ ] **Test File Location** - Tests placed alongside components in `__tests__/` or `src/test/unit/`.
- [ ] **Top-Level Mocks** - `vi.mock()` factories placed at the top level of test files.
- [ ] **QueryClient Isolation** - React components tested using `renderWithQueryClient()` with a fresh `createTestQueryClient()`.
- [ ] **Centralized Fixtures** - Mocks generated using `src/test/fixtures/` (`createMockUser()`, `createMockSessionInfo()`, `createMockUserDTO()`).
- [ ] **DOM Environment** - Component tests configured with `// @vitest-environment jsdom`.

### Frontend E2E Tests (Playwright)

- [ ] **Mobile Viewport** - Tests configured and validated for mobile viewport (Pixel 5: 393×851px).
- [ ] **Resilient Selectors** - Uses semantic `data-testid` in `kebab-case` (`{feature}-{element}-{variant?}`) placed on target interactive elements.
- [ ] **Page Object Model** - Complex flows organized using Page Objects under `e2e/`.
- [ ] **No Magic Constants** - Timeouts, test IDs, and test configurations imported from `e2e/constants/`.
- [ ] **Test Isolation** - State cleaned up between tests (`beforeEach` / `afterEach`); isolated fixtures used for mutating tests.

---

## 8. Observability & Operations

- [ ] **Prometheus Metrics** - New backend metrics registered in `backend/cmd/api/main.go` on dedicated internal port `:9091` (`/metrics`).
- [ ] **Service Role in Background Metrics** - Background database metric collectors inject Service Role Key into context to bypass RLS.
- [ ] **Grafana Dashboards** - New metric panels defined in `infra/grafana/provisioning/dashboards/magazyn.json` using `job="prometheus.scrape.magazyn_backend"`.
- [ ] **Operational Tooling** - Deployment, backup, rollback, and sanity procedures compatible with `./admin.sh`.

---

## 9. Review Triage & Severity Matrix

### 🔴 Critical (Must Fix Before Merge)

- PostgREST injection risks (missing `validation.SanitizeSearchTerm` on `ILIKE` inputs).
- Authentication or authorization bypasses; trusting client-supplied roles instead of backend `sessionInfo`.
- Broken database transactions or mutations performed outside atomic RPC stored procedures.
- Double-booking vulnerabilities or missing exclusion constraints.
- Inconsistent credit ledger updates (credit balance modified without `credit_history` entry).
- Broken build, lint errors, or TypeScript type failures.

### 🟡 Important (Should Fix)

- Missing unit tests for new business logic, query binders, or transformers.
- Violations of the 3-tier component architecture (mixing container state with presentation tables/forms).
- Component size exceeding 300 lines of code.
- Hardcoded URLs or route strings instead of `ROUTES` constants.
- Inline user-facing text instead of centralized UI string constants.
- Missing error boundary or unhandled error/loading states in UI islands.

### 🟢 Nice to Have (Suggestions & Polish)

- Minor styling adjustments or layout optimizations.
- Code deduplication that does not affect current architecture boundaries.
- Additional inline TSDoc/Godoc documentation comments for internal functions.

---

## 10. Usage Instructions

**AI Pair Programming**: Mention `@code-review-checklist.md` in prompts when asking for code review or architectural verification.

---

**Last Updated**: 2026-11-03  
**Version**: 2.0  
**Project**: Magazyn
