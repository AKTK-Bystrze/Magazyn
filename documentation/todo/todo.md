# Project TODO & Technical Debt Ledger

## Completed Refactorings (Milestones 1–4)

- **Backend Single Responsibility Decomposition**:
  - Extracted sub-services in `backend/internal/service/reservation/`: `reservation_service_create.go` (creation validation & atomic RPC), `reservation_service_update.go` (date checks, permissions, refunds), and `pricing.go` (`CalculateReservationCost`).
  - Extracted sub-services in `backend/internal/service/equipment/`: `equipment_service_availability.go`, `equipment_service_maintenance.go`, `equipment_service_mutation.go`, `equipment_service_types.go`.
  - Extracted HTTP query binders: `backend/internal/handler/reservation/reservation_query.go` and `backend/internal/handler/equipment/equipment_query.go`.
  - Extracted sub-handlers: `backend/internal/handler/reservation/reservation_admin_handler.go` (bulk updates & dashboard stats) and `backend/internal/handler/equipment/equipment_maintenance_handler.go` (maintenance logs).
  - Decomposed Supabase repositories: `reservation_repository_rpc.go` (atomic procedures), `reservation_repository_query.go`, `reservation_repository_detail.go`, `reservation_repository_stats.go`, `equipment_repository_list.go`, `availability.go`, `favorites.go`, `maintenance.go`, and dedicated `analytics_repository.go`.
  - Promoted `CalculateDays` and ISO date validation to shared `backend/internal/validation/date.go`.
- **Frontend Single Responsibility Decomposition**:
  - Decomposed `ReservationTable.tsx` into `ReservationTableRow.tsx`, `ReservationTableHeader.tsx`, `ReservationActionMenu.tsx`, and `ReservationTableStates.tsx`.
  - Decomposed `ReservationCartView.tsx` into `CartAvailabilityAlerts.tsx` and `AdminReservationDelegateSection.tsx`.
  - Decomposed `ReservationListContainer.tsx` with dedicated hooks: `useReservationDialogs.ts` and `useDismissibleMessage.ts`.
  - Extracted shared form fields: `EquipmentFormFields.tsx` (for Add/Edit equipment dialogs), `UserFormFields.tsx` (for Create/Edit user dialogs), and `ReservationDateAdjustmentFields.tsx` (for Modify Dates and Return dialogs).
  - Standardized `ConfirmationModal.tsx` on Radix/Shadcn dialog primitives.
  - Extracted `useCartCheckout.ts` (checkout mutation & optimistic state), `useReservationDateAdjustment.ts`, and `useInfiniteScrollTrigger.ts`.
- **Test Suite Refactoring & Centralization**:
  - Decomposed monolithic 597-line `reservation_service_test.go` into 5 domain-focused test files (`get`, `list`, `create`, `update`, `bulk`) + `reservation_service_test_helper_test.go`.
  - Centralized backend mock implementations in `backend/internal/testutils/mocks/` (`MockReservationService`, `MockCreditHistoryService`, `MockCreditRequestRepository`, `MockAnalyticsRepository`, `MockCalendarRepository`).
  - Centralized HTTP context helper `NewAuthenticatedRequest()` in `backend/internal/testutils/helpers.go`.
  - Deduplicated test setup in `backend/internal/service/user/user_service_test.go`.
  - Centralized frontend test fixtures in `frontend/src/test/fixtures/` (`auth-fixtures.ts`, `user-fixtures.ts`) and test utilities in `frontend/src/test/test-utils.tsx` (`renderWithQueryClient`).
  - Fixed TypeScript typing issues in `frontend/src/lib/auth/__tests__/redirect-manager.test.ts`.
  - Added unit test coverage for decomposed subcomponents (`ReservationTableRow.test.tsx`, `CartAvailabilityAlerts.test.tsx`).
- **Dense Agent-Centric Documentation**:
  - Added **Agent Quick-Reference & Task Matrix** to `documentation/README.md`.
  - Extended `documentation/backend/README.md` with SRP sub-service breakdown, query binders, RPC boundaries, test infrastructure, extension points, and cross-references.
  - Extended `documentation/frontend/architecture.md` with 3-tier component taxonomy, custom hook categorization, shared fixtures, extension points, and cross-references.
  - Updated `documentation/overview/detailed-architecture.md` Mermaid flowchart and layer descriptions.
  - Updated code references in `documentation/flows/reservation-flow.md` (`pricing.go`, `validation/date.go`, decomposed sub-services and repositories).
- **Verified Items from Previous Ledger**:
  - Item 1 (Credit recalculation on date modification in Update): Verified and implemented via `ModifyReservationDatesWithCredits` RPC and `reservation_service_update.go`.
  - Item 7 (Simplify reservation flow): Standardized modal dialogs and separated cart checkout logic.
  - Item 14 (Return dialog dates prefilled): Addressed via `ReservationDateAdjustmentFields.tsx`.

---

## High Priority Technical Debt

- Default DB test users passwords are reused in remote test db. Audit access control to remote DB.
- When running docker compose locally it overwrites the production file with test file. Resolve configuration file collision so running locally does not mutate production config.
- Deploy process: Create GitHub Actions workflow to deploy the app (push migrations, build and start containers, run sanity checks, rollback on failure, notify admins).

---

## Code Quality & Architecture Debt

- Supabase Schema: Maintain a `schema.md` documenting rationale behind table designs and complex RLS policies.
- API simplification: Analyze backend API and prune obsolete parameters/routes; draft API enhancement proposal.
- Remove legacy `magazyn v1` remnants if any remain.
- OpenAPI / Swagger integration:
  - Backend (Go): Evaluate `swaggo/swag`.
  - Frontend (React): Evaluate `openapi-typescript-codegen` or `@tanstack/react-query` generators.
- Metrics, component resource limitations, and automatic recovery systems.

---

## Future Features & Backlog

- **Notifications System**: Create abstract notification service supporting multiple delivery channels (SMTP email, in-app notifications, webhooks). Notify users about reservation lifecycle events and credit changes; notify admins on new bookings.
- **Overdue Reservations**: Status and automation logic for flagging overdue reservations and notifying borrowers.
- **Credits Request Feature**: Expand UI and approval workflows for user work credit requests.
- **Admin Credit History View**: Enable superAdmins to inspect user credit transaction histories.
- **Equipment Media Management**: Feature for admins to upload and remove equipment images via backend storage endpoints.
- **Favorite & Recently Used Equipment**: User-specific favoriting and recent items browse view.
- **Calendar Visualization**: Interactive calendar view for equipment availability.
- **Events & Group Reservations**: Group reservations under event tags (e.g., "spływ kursowy"), enabling one-click booking and filtering by event.
- **Contextual Cross-Navigation**: Hyperlink equipment names to equipment details and reservation IDs to reservation views across all tables.
- **Maintenance Logs on Return**: Allow users to attach maintenance notes and logs directly when completing returns.

---

## Open Domain & Bug Ledger

- **0. SMTP Service Setup**: Configure live SMTP transport for notification system.
- **2. Token Expiration Handling**: Verify backend handling when refresh token expires during long-lived client sessions.
- **3. Error Watcher for Maintenance Logs**: Automatically report context files upon logging exceptions or failure.
- **4. Unused Reservation Statuses**: Audit and prune any obsolete reservation enum values.
- **5. Create User Initial Credits Zero**: In create user view, fix initial credit balance input retaining leading zero.
- **6. Adjacent Date Overlap Warnings**: Display warnings for same-day handover (where start date matches end date of another booking).
- **8. New User Creation**: Enforce admin-only user creation (disable auto-registration if desired).
- **9. Reservation Breadcrumb 404s**: Fix invalid breadcrumb links (`reservations > reservation`).
- **10. Bulk Refund Mechanism**: Optimize bulk refund queries during admin `BulkUpdate` operations.
- **11. Reservation Details Breadcrumbs**: Display dates and item names instead of raw hash IDs in top navigation.
- **12. Highlight My Reservations**: Fix status-based highlighting for user's own reservations in admin views.
- **13. Mobile View Credit Balance**: Ensure top bar credits remain visible on small viewport screens.
- **19. Credit Adjustment Form Attachment**: Fix edge cases where credit adjustment form fails to attach on first user in list.
- **20. Email Redundancy in Profiles and Auth**: Audit whether redundant email column in `profiles` can be dropped or kept synchronized.
- **21. E2E Test Warnings**: Review non-fatal test warnings during Playwright runs.
- **22. Image Upload via Backend**: Ensure frontend uploads image assets via backend API rather than direct client storage access.
