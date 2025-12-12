# View Implementation Plan: Reservations View

## 1. Overview
The Reservations View serves as the central hub for managing equipment rentals. It adapts to two distinct contexts:
1.  **User Context ("My Reservations")**: Allows standard users to track their rental history, modify upcoming (PENDING) reservations, and cancel them if needed.
2.  **Admin Context ("Reservations Manager")**: Provides administrators with a comprehensive dashboard to oversee global reservation activity, perform bulk status updates, and manage the lifecycle of rentals (Pickups/Returns).

**Key Strategy: Reuse & Consistency**
The implementation will heavily leverage existing components from `src/components/ui` and `src/components/reservations` to ensure visual consistency and reduce development time.

## 2. View Routing
- **User View**: `/reservations`
  - Accessible to: Text-Authenticated Users
- **Admin View**: `/admin/reservations`
  - Accessible to: Users with `admin` role
- **Details View** (Shared/Dynamic): `/reservations/[id]` (for deep linking details)

## 3. Component Structure

### Pages (Astro)
- `src/pages/reservations/index.astro` (User Entry)
- `src/pages/admin/reservations/index.astro` (Admin Entry)

### Core Components (React)
- `ReservationListContainer.tsx` (Smart Wrapper: Handles data fetching, URL sync)
  - `ReservationToolbar.tsx`
    - `SearchInput.tsx` (Reuse `ui/input.tsx` + `lucide-react` icons)
    - `StatusFilter.tsx` (Reuse `ui/select.tsx` or `ui/radio-group.tsx`)
    - `DateRangeFilter.tsx` (Adapt from `reservations/DateRangePicker.tsx`)
    - `BulkActionMenu.tsx` (Admin only)
  - `ReservationView.tsx` (Presentation Switcher)
    - `ReservationTable.tsx` (Admin Mode - Density focused)
      - `ReservationRow.tsx`
    - `ReservationCardList.tsx` (User Mode - Card focused)
      - `ReservationCard.tsx` (Reuse layout patterns from `CartItem.tsx` and `EquipmentCard.tsx`)
  - `Pagination.tsx` (Generic component, likely to be created reusable)

### Shared/UI Components
- `StatusBadge.tsx` (Wrapper around `ui/badge.tsx` with status-specific variant logic)
- `ActionMenu.tsx` (Dropdown for row actions)
- `AuditTimeline.tsx` (Displays history in details)

### Dialogs/Modals
- `ModifyReservationDialog.tsx` (Reuse `reservations/DateRangePicker.tsx`)
- `CancelReservationDialog.tsx` (Follow visual pattern of `reservations/ConfirmationModal.tsx`)
- `AdminStatusDialog.tsx` (Status override)

## 4. Component Details

### `ReservationListContainer`
- **Purpose**: Main state manager. Syncs URL search params with React Query state.
- **Props**: `mode: 'user' | 'admin'`, `initialFilters?`
- **State**: `page`, `status`, `sort`, `search`.
- **Interactions**: Updates URL on filter change.

### `ReservationTable` (Admin)
- **Purpose**: High-density view for admins.
- **Columns**: Selection (checkbox), Equipment + ID, User (Avatar + Name), Dates, Status, Cost, Actions.
- **Features**: Sortable headers.
- **Props**: `data: ReservationListItem[]`, `onSelectionChange`, `onSort`.
- **Reuse**: Use `src/lib/utils/date-utils.ts` for all date formatting.

### `ReservationCard` (User)
- **Purpose**: User-friendly display of a single reservation.
- **Content**: Equipment Image (thumbnail), Name, Date Range, Status Badge, Cost.
- **Actions**: "Modify" (if PENDING), "Cancel" (if PENDING), "View Details".
- **Reuse**:
  - `src/components/ui/card.tsx` for container.
  - `src/components/ui/badge.tsx` for status.
  - `src/lib/utils/date-utils.ts` for date formatting (`formatDate`, `calculateDays`).
  - `src/lib/utils/text-utils.ts` for pluralization.

### `ModifyReservationDialog`
- **Purpose**: Allows users to change dates.
- **Reuse**:
  - **Critical**: Use `src/components/reservations/DateRangePicker.tsx` directly to handle date inputs and basic validation.
  - Wrap in `src/components/ui/dialog.tsx` (or `sheet` if mobile preferred).
- **Validation**:
  - Start Date > Now.
  - End Date > Start Date.
  - Checks availability via `GET /equipment/:id/availability`.
  - Warns if extension cost > 50%.
- **Events**: `onSubmit` (calls patch API).

### `CancelReservationDialog`
- **Purpose**: Confirmation of cancellation with refund info.
- **Reuse**:
  - Model the internal layout after `src/components/reservations/ConfirmationModal.tsx` for consistency (Header, Cost/Refund Summary, Buttons).
  - Use `ui/alert.tsx` for "Irreversible" warnings.

## 5. Types

Uses existing types from `@src/types/reservations/reservation.types.ts`:
- `ReservationListItem`: For the main list data.
- `ReservationDetail`: For the full details view.
- `ReservationAuditEntry`: For history.

New ViewModels/Props:
- `FilterState`:
  ```typescript
  export interface FilterState {
    page: number;
    perPage: number;
    status: Enums<"reservation_status"> | 'ALL';
    sort: 'created_desc' | 'date_asc' | 'date_desc';
    query?: string; // Search user or equipment
  }
  ```

## 6. State Management
- **URL State**: The "source of truth" for filters (using `useSearchParams`). This ensures the back button works and links are shareable.
- **Server State**: `TanStack Query` (`useQuery(['reservations', filters])`) handles caching and deduping.
- **Form State**: `React Hook Form` + `zod` used within Dialogs for validation.

## 7. API Integration

### List Reservations
- **Endpoint**: `GET /reservations`
- **Params**: `page`, `per_page`, `status`, `user_id` (if admin & filtering), `sort`.
- **Response**: `{ data: ReservationListItem[], meta: PaginationMeta }`
- **Transformation**: Update `src/lib/transformers/reservation.transformer.ts` to include response transformers (converting backend snake_case to frontend camelCase if necessary).

### Modify Reservation
- **Endpoint**: `PATCH /reservations/:id`
- **Body**: `{ startDate, endDate }`
- **Optimistic Update**: Update specific item in cache.

### Cancel Reservation
- **Endpoint**: `PATCH /reservations/:id`
- **Body**: `{ status: 'DENIED' }`

### Bulk Update (Admin)
- **Endpoint**: `PATCH /reservations/bulk`
- **Body**: `{ reservationIds: string[], status: string }`

### Availability Check
- **Endpoint**: `GET /equipment/:id/availability?start=...&end=...`
- **Usage**: Called inside `ModifyReservationDialog` before submission.

## 8. User Interactions

### User Workflow
1.  **View**: User sees cards of "My Reservations", sorted by most recent.
2.  **Filter**: Clicks "Pending" pill -> list filters.
3.  **Modify**: Clicks "Modify" on a future trip.
    - Dialog opens (reusing `DateRangePicker`).
    - Picks new dates.
    - System checks availability (Async validation).
    - User confirms -> Toast success -> Card updates.
4.  **Cancel**: Clicks "Cancel".
    - Confirmation alert (Cannot undo).
    - Confirms -> Status becomes DENIED (Red).

### Admin Workflow
1.  **View**: Admin sees table of ALL reservations.
2.  **Action**: User arrives for pickup.
    - Admin filters by name or "Today".
    - Checks "Pending" items.
    - Selects items -> Clicks "Mark Rented".
    - Status updates to RENTED.
3.  **Return**: User returns gear.
    - Admin finds "Rented" items.
    - Clicks "Mark Returned".

## 9. Conditions and Validation

- **Modification Window**: Users can only modify `PENDING` items.
- **Date Validity**: Start Date cannot be in the past.
- **Availability**: The new date range MUST NOT overlap with existing reservations (checked via API).
- **Credit Balance**: If extension costs more, User must have credits. (API returns error 402 if insufficient, UI handles this).
- **Admin Overrides**: Admins bypass ownership checks but are restricted from modifying `RETURNED` or `DENIED` final states unless via specific "Correction" flow (out of scope for basic view).

## 10. Error Handling
- **Network Failures**: Global Toast error.
- **Stale Data**: If user tries to book/modify but item was just taken, API returns 409 Conflict. UI displays: "Dates no longer available".
- **Empty States**: specialized empty states ("No active reservations" vs "No reservations match filter").

## 11. Implementation Steps

1.  **Setup Types**: Verify `reservation.types.ts` covers all DTOs (it appears complete). Add `FilterState` interfaces locally.
2.  **API Services**: Update `src/lib/api/reservations.ts` and **extend `src/lib/transformers/reservation.transformer.ts`** to handle incoming reservation data transformation.
3.  **UI Components Auditing**:
    - Verify `src/components/reservations/DateRangePicker.tsx` is importable.
    - Review `src/lib/utils/date-utils.ts` for all date needs.
    - Create `StatusBadge` using `src/components/ui/badge.tsx`.
4.  **Feature Components**:
    - Build `ReservationListContainer` structure.
    - Implement `ReservationFilters` with URL sync.
5.  **Dialog Implementation**:
    - Build `ModifyReservationDialog` using **`DateRangePicker`**.
    - Build `CancelReservationDialog`.
6.  **Integration**:
    - Connect `useQuery` in Container.
    - Connect `useMutation` in Actions.
7.  **Pages**:
    - Create `src/pages/reservations/index.astro`.
    - Create `src/pages/admin/reservations/index.astro` (with Admin flag prop).
8.  **Review**:
    - Verify User cannot see other users' data (API enforced, but UI should be clean).
    - Verify Admin bulk actions work.
