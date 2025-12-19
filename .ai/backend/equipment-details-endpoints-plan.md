# Equipment Details Backend - Minimal Implementation Plan

## Overview

This plan covers implementing **only** the endpoint needed for manual maintenance log creation. Other functionality identified in the original plan already exists in the codebase.

> [!NOTE]
> See [equipment-details-reuse-guide.md](./equipment-details-reuse-guide.md) for how to consume existing endpoints instead of creating duplicates.

---

## Endpoint to Implement

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/equipment/{id}/maintenance-logs` | POST | Add a maintenance log entry (Admin only) |

---

## Proposed Changes

### 1. Types

#### [MODIFY] `internal/types/equipment_types.go`

Add request type for creating maintenance logs:

```go
// CreateMaintenanceLogCommand represents a request to create a maintenance log
type CreateMaintenanceLogCommand struct {
    Notes *string `json:"notes"`
}
```

---

### 2. Repository Layer

#### [MODIFY] `internal/repository/equipment.go`

Add interface method:

```go
// CreateMaintenanceLog creates a new maintenance log entry
CreateMaintenanceLog(ctx context.Context, equipmentID string, previousStatus, newStatus string, notes *string, adminID string) (*types.PublicMaintenanceLogsSelect, error)
```

#### [MODIFY] `internal/repository/supabase/equipment_repository.go`

Implement the method:

```go
// CreateMaintenanceLog creates a new maintenance log entry
func (r *EquipmentRepository) CreateMaintenanceLog(ctx context.Context, equipmentID string, previousStatus, newStatus string, notes *string, adminID string) (*types.PublicMaintenanceLogsSelect, error) {
    insert := types.PublicMaintenanceLogsInsert{
        EquipmentID:    equipmentID,
        PreviousStatus: &previousStatus,
        NewStatus:      newStatus,
        Notes:          notes,
        AdminID:        &adminID,
    }

    data, _, err := r.client.From(constants.TableMaintenanceLogs).
        Insert(insert, false, "", "", "").
        Single().
        Execute()
    if err != nil {
        return nil, fmt.Errorf("failed to create maintenance log: %w", err)
    }

    var log types.PublicMaintenanceLogsSelect
    if err := json.Unmarshal(data, &log); err != nil {
        return nil, fmt.Errorf("failed to unmarshal maintenance log: %w", err)
    }

    return &log, nil
}
```

---

### 3. Service Layer

#### [MODIFY] `internal/service/equipment/equipment_service.go`

Add interface method:

```go
// CreateMaintenanceLog adds a maintenance log entry for equipment
CreateMaintenanceLog(ctx context.Context, equipmentID string, notes *string, adminID string) (*types.MaintenanceLogDTO, error)
```

Implement:

```go
func (s *equipmentService) CreateMaintenanceLog(ctx context.Context, equipmentID string, notes *string, adminID string) (*types.MaintenanceLogDTO, error) {
    // 1. Get current equipment to capture status
    eq, err := s.repo.GetByID(ctx, equipmentID)
    if err != nil {
        return nil, types.NewNotFoundError("Equipment", equipmentID)
    }

    // 2. Create log with current status as both previous and new (note-only entry)
    log, err := s.repo.CreateMaintenanceLog(ctx, equipmentID, eq.Status, eq.Status, notes, adminID)
    if err != nil {
        logger.Errorf(ctx, "Failed to create maintenance log: %v", err)
        return nil, types.NewInternalError("Failed to create maintenance log", err)
    }

    // 3. Return DTO (admin username will need to be fetched or passed)
    return &types.MaintenanceLogDTO{
        ID:             log.ID,
        PreviousStatus: log.PreviousStatus,
        NewStatus:      log.NewStatus,
        Notes:          log.Notes,
        AdminUsername:  "", // Could be fetched if needed
        CreatedAt:      log.CreatedAt,
    }, nil
}
```

---

### 4. Handler Layer

#### [MODIFY] `internal/handler/equipment/equipment_handler.go`

Add handler method:

```go
// HandleCreateMaintenanceLog handles POST /equipment/{id}/maintenance-logs
func (h *EquipmentHandler) HandleCreateMaintenanceLog(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    adminID := common.GetUserIDFromContext(r)
    role := common.GetUserRoleFromContext(r)

    // Admin-only check
    if role != auth.RoleAdmin && role != auth.RoleSuperAdmin {
        common.RespondError(ctx, w, http.StatusForbidden, "Admin access required")
        return
    }

    id := r.PathValue("id")
    if id == "" {
        common.RespondError(ctx, w, http.StatusBadRequest, "Equipment ID is required")
        return
    }

    var cmd types.CreateMaintenanceLogCommand
    if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
        common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
        return
    }

    response, err := h.service.CreateMaintenanceLog(ctx, id, cmd.Notes, adminID)
    if err != nil {
        common.RespondWithError(ctx, w, err)
        return
    }

    common.RespondJSON(ctx, w, http.StatusCreated, response)
}
```

---

### 5. Router Registration

#### [MODIFY] `cmd/api/main.go`

Add route (with admin middleware):

```go
mux.HandleFunc("POST /equipment/{id}/maintenance-logs", 
    authMiddleware(rbacMiddleware(equipmentHandler.HandleCreateMaintenanceLog)))
```

---

## Response Format

### POST /equipment/{id}/maintenance-logs

**Request:**
```json
{
  "notes": "Replaced battery pack, cleaned lens"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "previous_status": "ok",
  "new_status": "ok",
  "notes": "Replaced battery pack, cleaned lens",
  "admin_username": "",
  "created_at": "2024-01-15T10:30:00Z"
}
```

---

## Authorization

- **POST `/equipment/{id}/maintenance-logs`**: Admin role required

---

## Implementation Order

1. Add `CreateMaintenanceLogCommand` type
2. Add repository interface method and implementation
3. Add service method
4. Add handler
5. Register route
6. Test endpoint

---

## Verification

```bash
# Test creating a maintenance log (requires admin token)
curl -X POST \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Routine maintenance performed"}' \
  http://localhost:8080/equipment/{equipment_id}/maintenance-logs
```
