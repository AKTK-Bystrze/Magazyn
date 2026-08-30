# Task: Expose `is_free` in Reservation API & Add Free Badge to UI

## Context

Free reservations were introduced on this branch. The `is_free` flag exists in the database
(`reservations.is_free`) and is read by the Go backend, but it is NOT currently returned in
the API response (`ReservationListItem` type). As a result the admin UI cannot visually
distinguish free reservations from paid ones.

This task restores that visibility end-to-end.

---

## Scope

### 1. Backend — already done
`IsFree bool` has been restored to `ReservationListItem` in
`backend/internal/types/reservation_types.go` and both repository mappers populate it.
No backend changes needed.

### 2. Frontend — API layer

File: `frontend/src/types/reservations/reservation.types.ts`

Add `isFree: boolean` to the `ReservationListItem` TypeScript type (camelCase, matches the
transformer convention). The existing transformer in
`frontend/src/lib/transformers/reservation.transformer.ts` should map `is_free` to `isFree`
alongside the other snake_case -> camelCase conversions.

Check the transformer to understand the convention before adding.

### 3. Frontend — Admin Reservations Table

File: `frontend/src/components/reservations/` (find the admin table component)

When `reservation.isFree === true`, render a small badge next to the equipment name or the
credit cost column. Suggested appearance:
- Use the existing Shadcn Badge component (`frontend/src/components/ui/badge.tsx`)
- Variant: `outline` or a green variant
- Label: `"Bezplatna"` (Polish, consistent with the rest of the UI strings)
- `data-testid="free-reservation-badge-{reservationId}"` for testability

### 4. E2E test

File: `frontend/e2e/tests/admin/reservation-management.spec.ts`

After step 9 in the existing test "Happy Path: Admin creates free reservation for user",
add an assertion that the `free-reservation-badge-{reservationId}` test id is visible in the
row. The test already has `reservationId` available.

---

## Conventions

- All UI strings must use Polish (see /ui_strings_map workflow).
- Follow the existing transformer pattern in `reservation.transformer.ts`.
- Do not add inline comments; use TSDoc for exported helpers.
- Run `npm run lint` in `frontend/` after making changes.

---

## Verification

```bash
# Lint
cd frontend && npm run lint

# E2E (just the relevant test)
node node_modules/@playwright/test/cli.js test e2e/tests/admin/reservation-management.spec.ts --reporter=list
```

Expected: badge visible for free reservations, not visible for paid ones.
