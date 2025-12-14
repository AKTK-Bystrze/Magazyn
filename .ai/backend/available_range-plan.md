# Backend Implementation Plan: Equipment Availability Date Range Filter

## 1. Overview

This plan implements backend support for filtering equipment by availability date range. When `available_from` and `available_to` query parameters are provided to `GET /api/equipment`, the API will return only equipment that has **no conflicting reservations** for the entire specified date range.

**Current State:**
- `EquipmentListQuery` lacks `AvailableFrom`/`AvailableTo` fields
- Handler does not parse these query parameters
- Repository `List()` does not filter by availability
- `GetConflictingReservations()` exists but works per-equipment only

---

## 2. Files to Modify

### 2.1 Types Layer

#### [MODIFY] [equipment_types.go](file:///e:/bystrze/Magazyn/backend/internal/types/equipment_types.go)

**Add fields to `EquipmentListQuery`:**

```go
type EquipmentListQuery struct {
    Page            int     `json:"page"`
    PerPage         int     `json:"per_page"`
    TypeID          *string `json:"type_id"`
    Search          *string `json:"search"`
    Status          *string `json:"status"`
    IncludeArchived bool    `json:"include_archived"`
    // NEW
    AvailableFrom   *string `json:"available_from"`  // ISO date YYYY-MM-DD
    AvailableTo     *string `json:"available_to"`    // ISO date YYYY-MM-DD
}
```

---

### 2.2 Handler Layer

#### [MODIFY] [equipment_handler.go](file:///e:/bystrze/Magazyn/backend/internal/handler/equipment/equipment_handler.go)

**Add query parameter parsing in `HandleList()`:**

```go
// After existing query parsing (around line 44)
if availFrom := r.URL.Query().Get("available_from"); availFrom != "" {
    query.AvailableFrom = &availFrom
}
if availTo := r.URL.Query().Get("available_to"); availTo != "" {
    query.AvailableTo = &availTo
}

// Optional: Validate that both are provided together
if (query.AvailableFrom != nil) != (query.AvailableTo != nil) {
    common.RespondError(ctx, w, http.StatusBadRequest, 
        "Both available_from and available_to must be provided together")
    return
}
```

---

### 2.3 Repository Layer

#### [MODIFY] [interfaces.go](file:///e:/bystrze/Magazyn/backend/internal/repository/interfaces.go)

**Add new method to `EquipmentRepository` interface:**

```go
// GetEquipmentIDsWithConflicts returns IDs of equipment that have conflicting reservations
// for the given date range
GetEquipmentIDsWithConflicts(ctx context.Context, startDate, endDate string) ([]string, error)
```

#### [MODIFY] [equipment_repository.go](file:///e:/bystrze/Magazyn/backend/internal/repository/supabase/equipment_repository.go)

**Implement the new method:**

```go
// GetEquipmentIDsWithConflicts finds all equipment IDs that have active reservations
// overlapping with the given date range
func (r *equipmentRepository) GetEquipmentIDsWithConflicts(ctx context.Context, startDate, endDate string) ([]string, error) {
    data, _, err := r.client.From("reservations").
        Select("equipment_id", "exact", false).
        Lte("start_date", endDate).
        Gte("end_date", startDate).
        In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented}).
        Execute()

    if err != nil {
        return nil, err
    }

    var reservations []struct {
        EquipmentID string `json:"equipment_id"`
    }
    if err := json.Unmarshal(data, &reservations); err != nil {
        return nil, err
    }

    // Deduplicate
    seen := make(map[string]bool)
    var ids []string
    for _, r := range reservations {
        if !seen[r.EquipmentID] {
            seen[r.EquipmentID] = true
            ids = append(ids, r.EquipmentID)
        }
    }

    return ids, nil
}
```

**Modify `List()` to filter by availability:**

```go
func (r *equipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error) {
    qb := r.client.From("equipment").Select("*", "exact", false)

    // ... existing filters ...

    // NEW: Exclude equipment with conflicting reservations
    if query.AvailableFrom != nil && query.AvailableTo != nil {
        conflictIDs, err := r.GetEquipmentIDsWithConflicts(ctx, *query.AvailableFrom, *query.AvailableTo)
        if err != nil {
            return nil, 0, err
        }
        if len(conflictIDs) > 0 {
            // NOT IN filter - exclude these IDs
            qb = qb.Not("id", "in", fmt.Sprintf("(%s)", strings.Join(quoteIDs(conflictIDs), ",")))
        }
    }

    // ... rest of existing code ...
}

// Helper to quote IDs for NOT IN
func quoteIDs(ids []string) []string {
    quoted := make([]string, len(ids))
    for i, id := range ids {
        quoted[i] = fmt.Sprintf("'%s'", id)
    }
    return quoted
}
```

> [!WARNING]  
> The Supabase Go client's `Not(..., "in", ...)` syntax may need verification. Alternative: use RPC if PostgREST limitations are encountered.

---

## 3. Alternative Approach: Supabase RPC

If PostgREST `NOT IN` filtering proves difficult, create a stored procedure:

```sql
CREATE OR REPLACE FUNCTION get_available_equipment(
    p_available_from DATE,
    p_available_to DATE,
    p_type_id UUID DEFAULT NULL,
    p_status TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL,
    p_include_archived BOOLEAN DEFAULT FALSE,
    p_page INT DEFAULT 1,
    p_per_page INT DEFAULT 25
)
RETURNS TABLE (
    equipment JSONB,
    total_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH available_equipment AS (
        SELECT e.*
        FROM equipment e
        WHERE (p_include_archived OR NOT e.is_archived)
          AND (p_type_id IS NULL OR e.type_id = p_type_id)
          AND (p_status IS NULL OR e.status = p_status)
          AND (p_search IS NULL OR e.name ILIKE '%' || p_search || '%' 
               OR e.description ILIKE '%' || p_search || '%')
          AND NOT EXISTS (
              SELECT 1 FROM reservations r
              WHERE r.equipment_id = e.id
                AND r.status IN ('PENDING', 'RENTED')
                AND r.start_date <= p_available_to
                AND r.end_date >= p_available_from
          )
    )
    SELECT 
        jsonb_agg(ae.*) AS equipment,
        COUNT(*) OVER () AS total_count
    FROM available_equipment ae
    ORDER BY ae.name
    LIMIT p_per_page
    OFFSET (p_page - 1) * p_per_page;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Validation

### Date Validation (Handler Level)

```go
// In handler, validate date format
func isValidDate(dateStr string) bool {
    _, err := time.Parse("2006-01-02", dateStr)
    return err == nil
}

// Validate in HandleList
if query.AvailableFrom != nil && !isValidDate(*query.AvailableFrom) {
    common.RespondError(ctx, w, http.StatusBadRequest, "Invalid available_from date format, expected YYYY-MM-DD")
    return
}
```

---

## 5. Verification Plan

### 5.1 Unit Tests

**File:** `backend/internal/repository/supabase/equipment_repository_test.go`

```go
func TestGetEquipmentIDsWithConflicts(t *testing.T) {
    // Test that equipment with overlapping reservations is returned
}

func TestList_WithAvailabilityFilter(t *testing.T) {
    // Test that List excludes equipment with conflicts when dates provided
}
```

**Run:** `go test ./internal/repository/supabase/... -v -run TestEquipment`

### 5.2 Integration Tests

**File:** `backend/internal/handler/equipment/equipment_handler_test.go`

```go
func TestHandleList_AvailabilityFilter(t *testing.T) {
    // Test API returns filtered equipment when available_from/to provided
}

func TestHandleList_AvailabilityFilter_ValidationError(t *testing.T) {
    // Test 400 when only one date param provided
}
```

**Run:** `go test ./internal/handler/equipment/... -v`

### 5.3 Manual Verification

1. Start backend: `go run cmd/api/main.go`
2. Create test data:
   - Equipment A (no reservations)
   - Equipment B (reservation: 2024-01-15 to 2024-01-20)
3. Test queries:
   ```bash
   # Should return both A and B
   curl "http://localhost:8080/api/equipment"
   
   # Should return only A (B has conflict)
   curl "http://localhost:8080/api/equipment?available_from=2024-01-16&available_to=2024-01-18"
   
   # Should return both (no conflict in this range)
   curl "http://localhost:8080/api/equipment?available_from=2024-01-21&available_to=2024-01-25"
   ```

---

## 6. Implementation Steps

### Phase 1: Types & Handler
- [ ] **Step 1.1:** Add `AvailableFrom`/`AvailableTo` to `EquipmentListQuery`
- [ ] **Step 1.2:** Parse query params in `HandleList`
- [ ] **Step 1.3:** Add validation for paired params and date format

### Phase 2: Repository
- [ ] **Step 2.1:** Add `GetEquipmentIDsWithConflicts` to interface
- [ ] **Step 2.2:** Implement in `equipment_repository.go`
- [ ] **Step 2.3:** Modify `List()` to exclude conflicting equipment

### Phase 3: Testing
- [ ] **Step 3.1:** Add unit tests for repository
- [ ] **Step 3.2:** Add handler tests
- [ ] **Step 3.3:** Manual verification with curl

### Phase 4: Linting
- [ ] **Step 4.1:** Run `golangci-lint run ./...`

---

## 7. Dependencies

- None - uses existing Supabase client patterns
- May require RPC approach if `Not(..., "in", ...)` has limitations
