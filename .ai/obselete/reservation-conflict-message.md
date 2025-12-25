# Enhanced Reservation Conflict Error Messages

## Overview

Currently, when a reservation fails due to a conflict (409 error), the error message shows:
```
Reservation failed: This equipment is already reserved: "Test Equip 20251210210440"
```

**Goal**: Enhance the error message to include **who** reserved the equipment and **when**:
```
Reservation failed: "Test Equip 20251210210440" is already reserved by appbystrze from 2025-12-14 to 2025-12-15
```

## Current Implementation

### Error Flow:
1. User tries to create a reservation
2. Backend RPC `create_reservations_batch` detects conflict
3. Returns error: `"Conflict detected for equipment {equipment_id}"`
4. Frontend replaces equipment ID with name
5. Displays simplified error message

### Current Code Locations:
- **Backend RPC**: `supabase/migrations/*_add_reservation_rpc.sql` - `create_reservations_batch` function
- **Backend Service**: `backend/internal/service/reservation/reservation_service.go:162`
- **Frontend Error Handling**: `frontend/src/components/reservations/ReservationCartView.tsx:111-128`

## Implementation Plan

### Option 1: Modify Database RPC (Recommended)

#### Step 1: Update PostgreSQL Stored Procedure

**File**: `supabase/migrations/*_add_reservation_rpc.sql`

**Current behavior**:
```sql
-- When conflict detected, raises exception with equipment_id
RAISE EXCEPTION 'Conflict detected for equipment %', conflict_equipment_id;
```

**Proposed change**:
```sql
-- Fetch conflict details including username and dates
SELECT 
  p.username,
  r.start_date,
  r.end_date
INTO conflict_username, conflict_start, conflict_end
FROM reservations r
JOIN profiles p ON r.user_id = p.id
WHERE r.equipment_id = conflict_equipment_id
  AND r.status IN ('PENDING', 'RENTED')
  AND r.start_date <= input_end_date
  AND r.end_date >= input_start_date
LIMIT 1;

-- Raise exception with detailed information
RAISE EXCEPTION 'Equipment % is reserved by % from % to %', 
  conflict_equipment_id, 
  conflict_username, 
  conflict_start, 
  conflict_end;
```

**Complexity**: Medium
- Requires understanding of PostgreSQL stored procedures
- Need to handle multiple conflicts (show first or all?)
- Must ensure performance isn't impacted

#### Step 2: Update Backend Error Handling

**File**: `backend/internal/service/reservation/reservation_service.go`

**Current**:
```go
return nil, types.NewConflictError("Reservation failed: " + err.Error(), nil)
```

**Proposed**:
```go
// Parse the error message from RPC to extract conflict details
// The error message now contains: "Equipment {id} is reserved by {username} from {start} to {end}"
return nil, types.NewConflictError("Reservation failed: " + err.Error(), nil)
```

**Complexity**: Low
- No changes needed if RPC error message is already formatted correctly
- Just pass through the detailed error message

#### Step 3: Frontend Display

**File**: `frontend/src/components/reservations/ReservationCartView.tsx`

**Current**:
```tsx
// Replace equipment IDs with names
cartState.items.forEach((item) => {
  if (errorMessage.includes(item.equipmentId)) {
    errorMessage = errorMessage.replace(item.equipmentId, `"${item.name}"`);
  }
});
```

**Proposed**: Keep as-is
- The ID replacement will still work
- The username and dates will already be in the message from backend

**Complexity**: None (already done)

---

### Option 2: Enhance Availability Endpoint (Alternative)

Instead of modifying the RPC, enhance the existing availability check endpoint.

#### Step 1: Update Repository Method

**File**: `backend/internal/repository/supabase/equipment_repository.go`

**Method**: `GetConflictingReservations`

**Current**:
```go
Select("id, start_date, end_date, status", "exact", false)
```

**Proposed**:
```go
Select("id, user_id, start_date, end_date, status, user:profiles!user_id(username)", "exact", false)
```

**Complexity**: Medium
- Requires creating a new type or extending `PublicReservationsSelect` to include username
- Need to handle the nested JOIN response

#### Step 2: Create New Type

**File**: `backend/internal/types/reservation_types.go`

**Add**:
```go
type ReservationConflict struct {
    ID        string `json:"id"`
    Username  string `json:"username"`
    StartDate string `json:"start_date"`
    EndDate   string `json:"end_date"`
    Status    string `json:"status"`
}
```

#### Step 3: Update Service Response

**File**: `backend/internal/service/equipment/equipment_service.go`

**Method**: `CheckAvailability`

**Update response type** to include username in conflicting reservations.

#### Step 4: Frontend Error Handling

**File**: `frontend/src/components/reservations/ReservationCartView.tsx`

**Add**:
```tsx
if (response.status === 409) {
  // Extract equipment ID and fetch availability details
  const availResponse = await fetch(`/api/equipment/${equipmentId}/availability?...`);
  const availData = await availResponse.json();
  
  // Build detailed error message from conflictingReservations
  if (availData.conflictingReservations?.length > 0) {
    const conflicts = availData.conflictingReservations;
    errorMessage = `"${itemName}" is already reserved:\n`;
    conflicts.forEach(conflict => {
      errorMessage += `\n• ${conflict.username} (${conflict.startDate} to ${conflict.endDate})`;
    });
  }
}
```

**Complexity**: Medium
- Requires additional API call during error handling
- More complex frontend logic

---

## Recommendation

**Use Option 1** (Modify Database RPC) because:
- ✅ Single source of truth for conflict detection
- ✅ Error message is generated at the point of conflict
- ✅ No additional API calls needed
- ✅ Simpler frontend code
- ✅ Better performance (no extra queries)

**Drawback**: Requires modifying PostgreSQL stored procedure, which is more complex than Go code changes.

---

## Testing Plan

### Test Cases:

1. **Single Conflict**
   - User A reserves Equipment X for 2025-12-14 to 2025-12-15
   - User B tries to reserve same equipment for overlapping dates
   - **Expected**: `"Equipment X is reserved by userA from 2025-12-14 to 2025-12-15"`

2. **Multiple Conflicts**
   - User tries to reserve 3 items, 2 are conflicted
   - **Expected**: Show both conflicts with details

3. **No Username (Edge Case)**
   - Conflict exists but user was deleted
   - **Expected**: Graceful fallback: `"reserved by unknown user"`

4. **Date Formatting**
   - Ensure dates are in user-friendly format
   - **Expected**: `YYYY-MM-DD` or localized format

---

## Implementation Checklist

### Backend:
- [ ] Locate the `create_reservations_batch` RPC function in migrations
- [ ] Add JOIN with `profiles` table to fetch username
- [ ] Update RAISE EXCEPTION to include username and dates
- [ ] Test RPC function with SQL queries
- [ ] Verify error message format

### Frontend:
- [ ] Verify equipment ID replacement still works
- [ ] Test error message display with new format
- [ ] Handle edge cases (no username, multiple conflicts)
- [ ] Update UI to display multi-line error messages properly

### Testing:
- [ ] Create test reservation
- [ ] Try to create conflicting reservation
- [ ] Verify error message shows username and dates
- [ ] Test with multiple conflicts
- [ ] Test edge cases

---

## Estimated Effort

- **Backend Changes**: 30-45 minutes
- **Frontend Changes**: 10-15 minutes (minimal)
- **Testing**: 15-20 minutes
- **Total**: ~1-1.5 hours

---

## Related Files

### Backend:
- `supabase/migrations/*_add_reservation_rpc.sql`
- `backend/internal/service/reservation/reservation_service.go`
- `backend/internal/types/reservation_types.go`

### Frontend:
- `frontend/src/components/reservations/ReservationCartView.tsx`
- `frontend/src/types/equipment.types.ts` (if updating availability response)

---

## Notes

- The frontend already has infrastructure to display detailed error messages
- The main work is in the PostgreSQL stored procedure
- Consider privacy implications of showing usernames in error messages
- May want to show "another user" instead of actual username for non-admins
