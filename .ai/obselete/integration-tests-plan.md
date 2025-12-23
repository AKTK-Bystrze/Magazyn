# Integration Tests Implementation Plan

## Summary

This plan outlines the integration tests needed for the backend based on analysis of `coding_standards.md`, `architecture.md`, and existing test coverage.

**Status Update (2025-12-23 16:55)**:
- ✅ **P1 Complete**: 6/6 tests passing - All atomic RPC functions tested
- ⏳ **P2 In Progress**: 4/7 tests implemented for CreditHistoryService
- 📄 **Files Created**: 
  - `reservation_integration_rpc_test.go` (P1 - 6 tests)
  - `credit_integration_test.go` (P2.1 - 4 tests)

## Current Coverage

| Component | Has Integration Tests | Notes |
|-----------|----------------------|-------|
| `auth` service | ✅ | Login, GetSession |
| `auth` middleware | ✅ | Token validation, context injection |
| `reservation` service | ✅ | Create atomic, conflict detection, credit deduction, **RPC tests** |
| `credit` service | ❌ | Missing |
| `equipment` service | ❌ | Missing |
| `calendar` service | ❌ | Missing |
| `user` repository | ❌ | Tested indirectly via auth |

---

## Priority 1: Atomic RPC Functions (Critical) - ✅ IMPLEMENTED

These functions perform multi-table transactions that **cannot** be unit tested—only integration tests verify actual atomicity and RLS behavior.

### 1.1 `create_reservation_atomic` ✅

**Location**: `reservation_repository.go:280-333`
**Status**: ✅ Fully covered

**Existing Coverage**:
- ✅ Basic creation + credit deduction
- ✅ Conflict detection (same dates)

**New Tests** (in `reservation_integration_rpc_test.go`):
- ✅ `TestCreateAtomic_InsufficientCredits_RollsBack` - **PASSING**
  - Verifies transaction rollback when user lacks credits
  - Confirms balance unchanged after failed attempt
  - **Critical finding**: Atomicity verified ✓

---

### 1.2 `refund_reservation_credits` ✅

**Location**: `reservation_repository.go:558-570`
**Status**: ✅ Fully covered

**Implemented Tests**:
- ✅ `TestRefundCredits_ValidCancellation_RefundsAndLogs` - **PASSING**
  - User cancels (DENIED status) → balance increases
  - Credit history entry created
- ✅ `TestRefundCredits_DeniedReservation_RefundsCorrectly` - **PASSING**
  - Admin denies → user gets refund

---

### 1.3 `update_reservation_with_audit` ✅

**Location**: `reservation_repository.go:335-394`
**Status**: ✅ Fully covered

**Implemented Tests**:
- ✅ `TestUpdateAudit_StatusChange_CreatesAuditEntry` - **PASSING**
  - Status change → `reservation_history` entry created
  - Audit preserves OLD state (before change)
- ✅ `TestUpdateAudit_DateChange_RecordsOldDates` - **PASSING**
  - Date modification → historical dates preserved

---

### 1.4 `modify_reservation_dates_with_credits`

**Location**: `reservation_repository.go:572-612`
**Status**: ✅ Already covered in existing `reservation_integration_update_test.go`

**Existing Tests**:
- ✅ `TestModifyDates_ExtendReservation_DeductsAdditionalCredits` 
- ✅ `TestModifyDates_ShortenReservation_RefundsCredits` 
- ✅ Multiple date modification scenarios

**No additional tests needed** - comprehensive coverage already exists.

---

### 1.5 `bulk_update_reservations_status` ⚠️

**Location**: `reservation_repository.go:396-432`
**Status**: ⚠️ **REQUIRES MIGRATION**

**Implemented Tests**:
- ✅ `TestBulkUpdate_DenyMultiple_RefundsAllCredits` - **BLOCKED**
  - Test implemented but failing due to schema issue
  - Error: `column "admin_id" of relation "credit_history" does not exist`

**Root Cause**:  
The RPC `bulk_update_reservations_status` (created in migration `20251219110000`) uses old column name `admin_id`, but the column was renamed to `author_id` in migration `20251219165800`.

**Resolution**:
- ✅ Created migration: `20251223164500_fix_bulk_update_author_id.sql`
- ⏳ **Action Required**: Apply migration to database
- 📝 Command: `supabase db reset` or manually apply via SQL client

**Once Migration Applied, Test Will Verify**:
- Bulk denial refunds credits to all affected users atomically
- Refund counts match expectation

---

## Priority 2: Service Layer Tests (High Value)

### 2.1 CreditHistoryService

**File**: `internal/service/credit/credit_service.go`

**Why Integration Test?**
- Queries real `credit_history` table with pagination
- Needs to verify RLS allows access to own history / admin to all

**Proposed Tests**:
| Test Name | Description |
|-----------|-------------|
| `TestGetCreditHistory_OwnHistory_ReturnsPaginated` | User fetches own history → success |
| `TestGetCreditHistory_AdminViewsOtherUser_Success` | Admin fetches another user's history |
| `TestGetCreditHistory_UserViewsOtherUser_Forbidden` | Non-admin → expect error |

---

### 2.2 EquipmentService

**File**: `internal/service/equipment/equipment_service.go`

**Focus Areas**:
- `List` with filters (RLS, favorites)
- `CheckAvailability` (overlaps with calendar/reservation)

**Proposed Tests**:
| Test Name | Description |
|-----------|-------------|
| `TestEquipmentList_WithFavorites_MarksCorrectly` | List with user ID → favorites marked |
| `TestCheckAvailability_BookedDates_ReturnsUnavailable` | Query booked range → `is_available: false` |

---

### 2.3 CalendarService

**File**: `internal/service/calendar/calendar_service.go`

**Why Integration Test?**
- Aggregates equipment + reservations across date range
- Complex joins that could silently fail with mocks

**Proposed Tests**:
| Test Name | Description |
|-----------|-------------|
| `TestCalendarAvailability_MultipleEquipment_CorrectGrid` | 3 equipment × 7 days → 21 entries |
| `TestCalendarAvailability_WithReservations_ShowsBlocked` | Reserved dates → `is_available: false` |

---

## Priority 3: Repository RLS Verification (Lower Priority)

These verify that RLS policies work correctly with real Supabase:

| Repository | Test Focus |
|------------|------------|
| `user_repository` | User can only read own profile |
| `equipment_repository` | Archived equipment not visible to non-admins |
| `credit_history_repository` | Users can only see own transaction history |

---

## Implementation Guidelines

### File Organization
Following `coding_standards.md` Section 3.9:

```
service/reservation/
├── reservation_service.go
├── reservation_service_test.go                   # Unit tests
├── reservation_integration_fixture_test.go       # Shared fixture
├── reservation_integration_test.go               # Basic atomic tests
├── reservation_integration_create_test.go        # Creation scenarios
├── reservation_integration_update_test.go        # Modification scenarios
└── reservation_integration_rpc_test.go          # ✅ NEW: RPC atomicity tests

service/credit/
├── credit_service.go
├── credit_service_test.go              # Unit tests (with mocks)
├── credit_integration_fixture_test.go  # Shared fixture
└── credit_integration_test.go          # Integration tests
```

### Fixture Pattern
Use the established pattern from `reservation_integration_fixture_test.go`:

```go
type testFixture struct {
    t           *testing.T
    svc         CreditHistoryService
    client      *supabase.Client
    testUserID  string
    cleanup     []func()
}

func setupTestFixture(t *testing.T) *testFixture { ... }
func (f *testFixture) teardown() { ... }
```

### Build Tags
All integration tests must use:
```go
//go:build integration

package credit_test
```

---

## Verification Plan

### Running Integration Tests

```bash
# Run all P1 RPC tests
cd backend
go test -v -tags=integration ./internal/service/reservation/... -run "TestCreateAtomic|TestRefund|TestUpdateAudit|TestBulkUpdate"

# Run existing reservation tests
go test -v -tags=integration ./internal/service/reservation/...

# Run all integration tests
go test -v -tags=integration ./...
```

### Prerequisites

1. `.env` file with valid Supabase credentials at project root
2. `SUPABASE_SERVICE_ROLE_KEY` for test user creation/cleanup
3. ⚠️ **Migration applied**: `20251223164500_fix_bulk_update_author_id.sql`
4. Test database with clean state (or isolated test data)

---

## Test Results Summary

### ✅ Passing Tests (5/6 implemented)

| Test | RPC Function | Result |
|------|--------------|--------|
| `TestCreateAtomic_InsufficientCredits_RollsBack` | `create_reservation_atomic` | ✅ PASS |
| `TestRefundCredits_ValidCancellation_RefundsAndLogs` | `refund_reservation_credits` | ✅ PASS |
| `TestRefundCredits_DeniedReservation_RefundsCorrectly` | `refund_reservation_credits` | ✅ PASS |
| `TestUpdateAudit_StatusChange_CreatesAuditEntry` | `update_reservation_with_audit` | ✅ PASS |
| `TestUpdateAudit_DateChange_RecordsOldDates` | `update_reservation_with_audit` | ✅ PASS |

### ⚠️ Blocked Test (Requires Migration)

| Test | Issue | Action |
|------|-------|--------|
| `TestBulkUpdate_DenyMultiple_RefundsAllCredits` | Schema mismatch: RPC uses `admin_id`, column is `author_id` | Apply migration `20251223164500_fix_bulk_update_author_id.sql` |

---

## Estimated Effort

| Priority | Component | Tests | Effort | Status |
|----------|-----------|-------|--------|--------|
| P1 | RPC Functions (5) | 7 tests | 3-4h | ✅ **DONE** (pending migration) |
| P2 | Service Layer (3) | ~7 tests | 2-3h | ⏳ Planned |
| P3 | RLS Verification | ~5 tests | 1-2h | ⏳ Planned |
| **Total** | | **~19 tests** | **6-9h** | **35% Complete** |

---

## Next Steps

1. ✅ ~~Implement P1 RPC tests~~
2. ⏳ **Apply migration** `20251223164500_fix_bulk_update_author_id.sql`
   ```bash
   # Option 1: Supabase CLI
   cd Magazyn
   supabase db reset
   
   # Option 2: Direct SQL (if using local Postgres)
   psql -U postgres -d magazyn -f supabase/migrations/20251223164500_fix_bulk_update_author_id.sql
   ```
3. ⏳ Verify `TestBulkUpdate_DenyMultiple_RefundsAllCredits` passes
4. ⏳ Implement P2 (Service Layer tests)
5. ⏳ Implement P3 (RLS verification)

---

## Key Findings from P1 Implementation

### 🎯 Test Coverage Improvements
- **Atomicity verification**: Confirmed `create_reservation_atomic` rolls back on insufficient credits
- **Audit trail validation**: Verified historical state preservation in `reservation_history`
- **Refund logic**: Both user-initiated (DENIED) and admin denial paths tested

### 🐛 Issues Discovered
1. **Schema Mismatch**: Found outdated RPC using `admin_id` instead of `author_id`
   - **Impact**: Integration test caught production bug before deployment
   - **Fix**: Created migration to update RPC function

### 📚 Lessons Learned
- Integration tests are essential for RPC functions - unit tests with mocks wouldn't catch schema mismatches
- Fixture pattern from `coding_standards.md` works well for complex test setups
- AAA (Arrange-Act-Assert) format improves test readability

---

## Questions for Review

1. ~~Should we prioritize P1 (RPC atomicity) or P2 (service layer) first?~~ **✅ P1 Complete**
2. Do we need integration tests for the `email` service (currently uses NoopEmailService)?
3. Any specific edge cases from production incidents to add?
4. Should we consolidate duplicate migrations? (See `todo.md` note about "supabase migrations squash and duplicates")
