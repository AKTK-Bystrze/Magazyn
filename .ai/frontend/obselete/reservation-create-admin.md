# Admin Reservation Creation Implementation Plan

## Overview
Enable administrators to create reservations on behalf of other users. This will be achieved by reusing the existing reservation checkout flow (`ReservationCartView`) and injecting a user selection step specifically for admins.

## Architecture & Reuse
- **Reuse**: `ReservationCartView` (Main checkout logic), `useReservationCart` (State), `useUsers` (User data).
- **New**: `UserSelector` (Component to select target user).
- **Modification**: Inject `userId` into `CreateReservationsCommand`.

## Implementation Steps

### 1. New Components

#### `src/components/admin/UserSelector.tsx`
A searchable dropdown component to select a user.
- **Props**:
  - `selectedUserId: string | null`
  - `onSelect: (userId: string) => void`
- **Logic**:
  - Use `useUsers` hook to fetch users.
  - Render a `Select` or `Combobox` (Shadcn UI).
  - Display username and email.

### 2. Component Updates

#### `src/components/reservations/ReservationCartView.tsx`
Update to handle admin context.
- **Props**: Add `isAdmin?: boolean`.
- **State**: Add `selectedUserId` state (if `isAdmin` is true).
- **Render**:
  - If `isAdmin` is true, render `<UserSelector />` at the top.
  - If `isAdmin` is true and no user is selected, disable the "Confirm" button or show validation error.
- **Logic**:
  - In `handleConfirmReservation`, if `isAdmin` is true, include `userId: selectedUserId` in the API command.
  - Note: `CreateReservationsCommand` in `src/types/reservations/reservation.types.ts` already has optional `userId`, so no type changes needed there.

### 3. Page Implementation

#### `src/pages/admin/reservations/create.astro`
New page for admin checkout.
- **Route**: `/admin/reservations/create`
- **Layout**: `AdminLayout`
- **Content**:
  - Check for `ADMIN` or `SUPER_ADMIN` role.
  - Render `<ReservationCartView client:only="react" initialCreditBalance={0} isAdmin={true} />`
  - Note: `initialCreditBalance` might need to be fetched for the *selected* user, or we might skip client-side credit validation for admins (since they can override). For MVP, we can pass 0 or a high number, or ideally fetch the selected user's credits when selected. *Decision: Admins can override, so strictly enforcing credit limit in UI is less critical, but good for info. Implementation: Fetch selected user details in `ReservationCartView` when user changes.*

### 4. Routing & Navigation

#### `src/lib/config/routes.ts`
- Add `ADMIN_RESERVATIONS_CREATE` to protected routes.

#### `src/components/equipment/EquipmentSearchContainer.tsx`
- Add `checkoutPath` prop (optional, default to user checkout).
- Pass `checkoutPath` to `CartIndicator`.

#### `src/components/equipment/CartIndicator.tsx`
- Add `checkoutPath` prop. Use it for the navigation link.

#### `src/pages/admin/equipment.astro`
- Pass `checkoutPath={ROUTES.PROTECTED.ADMIN_RESERVATIONS_CREATE}` to `EquipmentSearchContainer`.

## Verification
1. Log in as Admin.
2. Go to `/admin/equipment`.
3. Add item to cart.
4. Click Cart FAB.
5. Verify redirection to `/admin/reservations/create`.
6. Verify User Selector appears.
7. Select a user.
8. Confirm reservation.
9. Check `reservations` table in DB to confirm `user_id` matches the selected user, not the admin.
