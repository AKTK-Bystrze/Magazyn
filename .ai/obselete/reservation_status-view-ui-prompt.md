# UI Implementation Plan: Reservation Status View

## 1. Overview

The **Reservation Status View** enables users and admins to manage reservation status changes and view the complete audit history of modifications. This view provides:

- **Users**: Cancel their own PENDING reservations (change to DENIED), change status from PENDING to RETURNED
- **Admins**: Change status of any reservation (except final states RETURNED/DENIED)
- **All users**: View reservation history timeline showing date of change and who made it

Once a reservation reaches DENIED or RETURNED status, it cannot be modified further.

---

## 2. View Routing

| Path | Purpose |
|------|---------|
| `/reservations/[id]` | Reservation details with status management and audit history |

---

## 3. Component Structure

```
ReservationDetailsPage
├── ReservationHeader
│   ├── BackButton
│   ├── EquipmentInfo (name, type, internal_id)
│   └── StatusBadge
├── ReservationInfoCard
│   ├── DateRange (start_date - end_date)
│   ├── CreditCost
│   ├── UserInfo (username, email) [admin only]
│   └── CreatedAt
├── ReservationStatusActions
│   ├── CancelReservationButton [user: own PENDING only]
│   ├── MarkReturnedButton [user: own PENDING → RETURNED]
│   └── StatusChangeDropdown [admin: all non-final reservations]
└── ReservationAuditTimeline
    └── AuditEntry[] (status, changedBy, timestamp)
```

---

## 4. Component Details

### ReservationDetailsPage

- **Description**: Main page container that fetches reservation details and renders child components
- **Main elements**: Layout wrapper, loading skeleton, error boundary
- **Handled interactions**: None (delegated to children)
- **Validation**: Redirect if reservation not found or unauthorized
- **Types**: `ReservationDetail`
- **Props**: `reservationId: string` (from URL params)

### ReservationStatusActions

- **Description**: Renders available status change actions based on user role and current status
- **Main elements**: 
  - `Button` (Cancel - destructive variant)
  - `Button` (Mark as Returned)
  - `DropdownMenu` (Admin status change)
  - `ConfirmationDialog` for all status changes
- **Handled interactions**:
  - Click Cancel → Show confirmation → Call PATCH /reservations/:id with `status: "DENIED"`
  - Click Mark Returned → Show confirmation → Call PATCH /reservations/:id with `status: "RETURNED"`
  - Admin selects status → Show confirmation → Call PATCH /reservations/:id
- **Validation**:
  - User can only cancel/return own PENDING reservations
  - Admin cannot modify RETURNED or DENIED reservations
  - Status must be valid transition (PENDING → DENIED/RENTED/RETURNED, RENTED → RETURNED)
- **Types**: `UpdateReservationCommand`, `UpdateReservationResponse`
- **Props**: 
  ```typescript
  {
    reservation: ReservationDetail;
    currentUserId: string;
    isAdmin: boolean;
    onStatusChange: (newStatus: ReservationStatus) => void;
  }
  ```

### ReservationAuditTimeline

- **Description**: Displays chronological history of all reservation changes
- **Main elements**:
  - Vertical timeline with connecting line
  - `AuditEntry` cards showing status snapshot
  - User avatar/icon + username for who made change
  - Formatted timestamp
- **Handled interactions**: None (read-only)
- **Validation**: None
- **Types**: `ReservationAuditEntry[]`
- **Props**:
  ```typescript
  {
    auditTrail: ReservationAuditEntry[];
  }
  ```

### CancelReservationDialog

- **Description**: Confirmation dialog for cancellation with credit refund info
- **Main elements**: `AlertDialog` with warning message, credit refund amount, confirm/cancel buttons
- **Handled interactions**: Confirm → Trigger status change, Cancel → Close dialog
- **Validation**: Ensure reservation is still in PENDING state
- **Types**: `UpdateReservationCommand`
- **Props**:
  ```typescript
  {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    reservation: ReservationDetail;
    onConfirm: () => Promise<void>;
  }
  ```

---

## 5. Types

### Existing Types (from `reservation.types.ts`)

```typescript
// Reservation status enum
type ReservationStatus = "PENDING" | "RENTED" | "RETURNED" | "DENIED";

// Audit trail entry
type ReservationAuditEntry = {
  id: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  changedByUsername: string | null;
  createdAt: string;
};

// Full reservation details
type ReservationDetail = Reservation & {
  userEmail: string;
  equipmentInternalId: string;
  auditTrail: ReservationAuditEntry[];
};

// Update command
type UpdateReservationCommand = {
  startDate?: string;
  endDate?: string;
  status?: ReservationStatus;
};

// Update response
type UpdateReservationResponse = {
  id: string;
  equipmentId: string;
  startDate: string;
  endDate: string;
  status: ReservationStatus;
  creditCost: number;
  creditAdjustment: number;
  remainingBalance: number;
  updatedAt: string;
};
```

### New ViewModel Types

```typescript
// Status action availability
type StatusActionConfig = {
  canCancel: boolean;        // PENDING + (own || admin)
  canMarkReturned: boolean;  // PENDING + (own || admin)
  canChangeStatus: boolean;  // !final state + admin
  availableStatuses: ReservationStatus[]; // Valid transitions
};

// Formatted audit entry for display
type FormattedAuditEntry = ReservationAuditEntry & {
  formattedDate: string;     // e.g., "Dec 14, 2025 at 4:30 PM"
  relativeTime: string;      // e.g., "2 days ago"
  statusLabel: string;       // Polish label
  isInitialCreation: boolean;
};
```

---

## 6. State Management

### Custom Hook: `useReservationStatus`

```typescript
function useReservationStatus(reservationId: string) {
  // TanStack Query for fetching reservation details
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['reservation', reservationId],
    queryFn: () => getReservationById(reservationId),
  });

  // Mutation for status changes
  const updateStatusMutation = useMutation({
    mutationFn: (command: UpdateReservationCommand) => 
      updateReservation(reservationId, command),
    onSuccess: () => {
      queryClient.invalidateQueries(['reservation', reservationId]);
      queryClient.invalidateQueries(['reservations']); // Refresh list
    },
  });

  return {
    reservation: data,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutate,
    isUpdating: updateStatusMutation.isPending,
  };
}
```

### State Variables

- `isConfirmDialogOpen: boolean` - Controls confirmation dialog visibility
- `pendingStatus: ReservationStatus | null` - Status awaiting confirmation

---

## 7. API Integration

### GET /reservations/:id

- **Purpose**: Fetch reservation details with audit trail
- **Request**: `GET /reservations/{reservationId}`
- **Response**: `ReservationDetail` with `auditTrail` array
- **Errors**: 401 (Unauthorized), 403 (Forbidden), 404 (Not Found)

### PATCH /reservations/:id

- **Purpose**: Update reservation status
- **Request**: 
  ```typescript
  { status: "DENIED" | "RENTED" | "RETURNED" }
  ```
- **Response**: `UpdateReservationResponse` with credit adjustment info
- **Errors**: 
  - 400 (Invalid status transition)
  - 403 (Cannot modify other users' reservations or non-PENDING status)
  - 404 (Reservation not found)

---

## 8. User Interactions

| Interaction | User Type | Condition | Outcome |
|-------------|-----------|-----------|---------|
| Click "Cancel Reservation" | User | Own PENDING reservation | Show confirmation → Status → DENIED, credits refunded |
| Click "Mark as Returned" | User | Own PENDING reservation | Show confirmation → Status → RETURNED |
| Click "Cancel Reservation" | Admin | Any PENDING reservation | Show confirmation → Status → DENIED, credits refunded |
| Select status from dropdown | Admin | Any non-final reservation | Show confirmation → Status changes, credits adjusted |
| View audit timeline | All | Always | Display chronological change history |

---

## 9. Conditions and Validation

### Status Change Rules

| Current Status | User Can Change To | Admin Can Change To |
|----------------|-------------------|---------------------|
| PENDING | DENIED, RETURNED (own only) | DENIED, RENTED, RETURNED |
| RENTED | - | RETURNED |
| RETURNED | - | - (final state) |
| DENIED | - | - (final state) |

### UI Validations

1. **Action Visibility**:
   - Hide Cancel/Return buttons if status is RETURNED or DENIED
   - Hide Cancel/Return buttons if user is not owner (non-admin)
   - Show admin dropdown only for admin users

2. **Confirmation Required**:
   - All status changes require explicit confirmation
   - Show credit impact in confirmation dialog (refund amount for DENIED)

---

## 10. Error Handling

| Error | Display | Recovery |
|-------|---------|----------|
| 401 Unauthorized | Redirect to login | Session expired |
| 403 Forbidden | Toast: "Nie masz uprawnień do tej rezerwacji" | Navigate back |
| 404 Not Found | Full page error: "Rezerwacja nie znaleziona" | Navigate to list |
| 409 Conflict | Toast: "Status rezerwacji został już zmieniony" | Refetch data |
| Network Error | Toast: "Błąd połączenia. Spróbuj ponownie" | Retry button |

---

## 11. Implementation Steps

1. **Extend existing components**:
   - Add status change buttons to `ReservationCard.tsx`
   - Enhance `CancelReservationDialog.tsx` with credit refund display

2. **Create new components**:
   - `ReservationStatusActions.tsx` - Action buttons container
   - `ReservationAuditTimeline.tsx` - History timeline display
   - `StatusChangeDropdown.tsx` - Admin status selector

3. **Create hooks**:
   - `useReservationStatus.ts` - Manage status change mutations

4. **Add API methods**:
   - `updateReservationStatus()` in `reservations-api.ts`

5. **Create Reservation Details page**:
   - `src/pages/reservations/[id].astro`
   - `src/components/reservations/ReservationDetailsView.tsx`

6. **Add polish UI strings**:
   - Status labels in Polish
   - Confirmation messages
   - Error messages

7. **Test integration**:
   - Verify status changes for user/admin roles
   - Confirm audit trail updates
   - Check credit adjustments display

---

## Reference Documents

- **PRD**: `documentation/prd/overview.md` (sections 3.5.8-3.5.12)
- **User Stories**: 
  - `documentation/prd/stories/reservations_management.md` (US-015, US-017, US-020A)
  - `documentation/prd/stories/admin_reservations.md` (US-023, US-025)
- **API Spec**: `documentation/api-plan.md` (PATCH /reservations/:id)
- **Types**: `frontend/src/types/reservations/reservation.types.ts`
- **Existing Components**: 
  - `frontend/src/components/reservations/CancelReservationDialog.tsx`
  - `frontend/src/components/reservations/ReservationCard.tsx`
