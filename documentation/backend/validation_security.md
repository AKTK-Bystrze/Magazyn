# Input Validation & Security Best Practices

This document outlines the input validation standards and security practices for the Magazyn backend to prevent injection attacks and ensure data integrity.

## Validation Package

The `internal/validation` package provides centralized validation and sanitization utilities.

### Available Functions

#### `SanitizeSearchTerm(input string) string`

**Purpose**: Sanitizes user search input to prevent PostgREST operator injection attacks.

**Escapes**: `,`, `.`, `(`, `)`, `=`, `*`, `!`

**Example**:
```go
import "magazyn/backend/internal/validation"

search := r.URL.Query().Get("search")
sanitized := validation.SanitizeSearchTerm(search)
// Input: "%,role.eq.admin" → Output: "%\\,role\\.eq\\.admin"
```

**Critical**: Always use this function before passing search terms to PostgREST queries using `fmt.Sprintf` with ILIKE filters.

---

#### `ValidateUUID(id string) error`

**Purpose**: Validates UUID format (8-4-4-4-12 hexadecimal with hyphens).

**Example**:
```go
id := r.PathValue("id")
if err := validation.ValidateUUID(id); err != nil {
    common.RespondError(ctx, w, http.StatusBadRequest, "Invalid ID format")
    return
}
```

---

#### `ValidateISODate(date string) error`

**Purpose**: Validates ISO 8601 date format (YYYY-MM-DD).

**Example**:
```go
startDate := r.URL.Query().Get("start_date")
if err := validation.ValidateISODate(startDate); err != nil {
    common.RespondError(ctx, w, http.StatusBadRequest, "Invalid date format")
    return
}
```

---

#### `ValidateEnum(value string, allowedValues []string) error`

**Purpose**: Validates that a value is within allowed enum values.

**Example**:
```go
import "magazyn/backend/internal/constants"

status := r.URL.Query().Get("status")
if err := validation.ValidateEnum(status, constants.ValidEquipmentStatuses); err != nil {
    common.RespondError(ctx, w, http.StatusBadRequest, "Invalid status")
    return
}
```

---

#### `ValidateStringLength(str string, minLength, maxLength int) error`

**Purpose**: Validates string length is within acceptable range.

**Example**:
```go
import "magazyn/backend/internal/constants"

search := r.URL.Query().Get("search")
if err := validation.ValidateStringLength(search, 0, constants.MaxSearchLength); err != nil {
    common.RespondError(ctx, w, http.StatusBadRequest, "Search term too long")
    return
}
```

---

## Validation Constants

Defined in `internal/constants/constants.go`:

```go
// Enum validation
var ValidEquipmentStatuses = []string{EquipmentStatusOK, EquipmentStatusBroken, EquipmentStatusBlocked}
var ValidReservationStatuses = []string{...}

// Input length constraints
const (
    MaxSearchLength     = 100  // Maximum search query length
    MaxInternalIDLength = 50   // Maximum equipment internal ID length
    MinPasswordLength   = 8    // Minimum password length
)
```

---

## Security Best Practices

### 1. Handler Layer Validation

**Always validate input at the handler layer before passing to services:**

```go
func (h *EquipmentHandler) HandleGetByID(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    id := r.PathValue("id")
    
    // ✅ Validate UUID format
    if err := validation.ValidateUUID(id); err != nil {
        common.RespondError(ctx, w, http.StatusBadRequest, "Invalid equipment ID format")
        return
    }
    
    response, err := h.service.GetByID(ctx, id)
    // ...
}
```

### 2. Search Input Sanitization

**Always sanitize search terms in repository layer:**

```go
// ✅ SECURE
func (r *equipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) {
    if query.Search != nil && *query.Search != "" {
        searchTerm := validation.SanitizeSearchTerm(*query.Search)
        baseQuery = baseQuery.Or(fmt.Sprintf("name.ilike.%%%s%%", searchTerm), "")
    }
}

// ❌ VULNERABLE - DO NOT DO THIS
func (r *equipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) {
    if query.Search != nil && *query.Search != "" {
        searchTerm := *query.Search  // No sanitization!
        baseQuery = baseQuery.Or(fmt.Sprintf("name.ilike.%%%s%%", searchTerm), "")
    }
}
```

### 3. Enum Validation

**Use constants for enum validation:**

```go
// ✅ GOOD - Uses constants
if status != "" {
    if err := validation.ValidateEnum(status, constants.ValidEquipmentStatuses); err != nil {
        return errors
    }
}

// ❌ BAD - Hardcoded values
if status != "ok" && status != "broken" && status != "blocked" {
    return errors
}
```

### 4. Length Validation

**Prevent abuse with length limits:**

```go
// ✅ Validate search length
search := r.URL.Query().Get("search")
if search != "" {
    if err := validation.ValidateStringLength(search, 0, constants.MaxSearchLength); err != nil {
        common.RespondError(ctx, w, http.StatusBadRequest, "Search term too long")
        return
    }
}
```

---

## Common Vulnerabilities & Mitigations

### SQL/PostgREST Injection

**Attack Vector**: Injecting operators in search queries
```
GET /api/equipment?search=%,status.eq.broken
```

**Mitigation**: `SanitizeSearchTerm()` escapes operators
```go
searchTerm := validation.SanitizeSearchTerm(input)
// "%,status.eq.broken" → "%\\,status\\.eq\\.broken"
```

### Invalid UUID Format

**Attack Vector**: Passing malformed UUIDs to database queries
```
GET /api/equipment/invalid-format
```

**Mitigation**: `ValidateUUID()` rejects invalid formats
```go
if err := validation.ValidateUUID(id); err != nil {
    return HTTP 400
}
```

### Enum Bypass

**Attack Vector**: Passing invalid enum values
```
GET /api/equipment?status=HACKED
```

**Mitigation**: `ValidateEnum()` with constants
```go
if err := validation.ValidateEnum(status, constants.ValidEquipmentStatuses); err != nil {
    return HTTP 400
}
```

---

## Testing Validation

All validation functions have comprehensive unit tests in `internal/validation/postgrest_test.go`:

```bash
# Run validation tests
go test ./internal/validation -v

# All tests should pass including injection attack scenarios
```

**Test Coverage**:
- Special character escaping
- Injection attack attempts  
- UUID format validation
- Date format validation
- Enum validation
- String length validation

---

## Checklist for New Endpoints

When creating new HTTP handlers:

- [ ] Validate all path parameters (IDs) with `ValidateUUID()`
- [ ] Validate all date query params with `ValidateISODate()`
- [ ] Validate all enum query params with `ValidateEnum()`
- [ ] Validate search query length with `ValidateStringLength()`
- [ ] Sanitize search terms in repository with `SanitizeSearchTerm()`
- [ ] Return clear error messages (e.g., "Invalid equipment ID format")
- [ ] Add validation tests for your handler
