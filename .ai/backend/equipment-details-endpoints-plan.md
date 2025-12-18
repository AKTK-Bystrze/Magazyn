# Equipment Details Backend Endpoints Implementation Plan

## Overview

This plan covers implementing backend Go endpoints to support the Equipment Manager frontend view's details sheet functionality.

## Endpoints to Implement

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/equipment/{id}/maintenance-logs` | GET | List maintenance logs for equipment |
| `/equipment/{id}/maintenance-logs` | POST | Add a maintenance log entry |
| `/equipment/{id}/reservations` | GET | List reservation history for equipment |

---

## Proposed Changes

### 1. Database Schema Reference

The following existing tables will be used:

- **`maintenance_logs`** - Stores maintenance history
  - `id`, `equipment_id`, `previous_status`, `new_status`, `notes`, `admin_id`, `created_at`
  
- **`reservations`** - Stores reservation records
  - `id`, `user_id`, `equipment_id`, `start_date`, `end_date`, `status`, `credits`, `created_at`

---

### 2. Repository Layer

#### [MODIFY] `internal/repository/supabase/equipment_repository.go`

Add new methods:

```go
// GetMaintenanceLogs returns maintenance logs for an equipment item
func (r *EquipmentRepository) GetMaintenanceLogs(ctx context.Context, equipmentID string) ([]types.MaintenanceLog, error)

// CreateMaintenanceLog creates a new maintenance log entry
func (r *EquipmentRepository) CreateMaintenanceLog(ctx context.Context, log types.CreateMaintenanceLogInput) (*types.MaintenanceLog, error)

// GetEquipmentReservations returns reservation history for equipment
func (r *EquipmentRepository) GetEquipmentReservations(ctx context.Context, equipmentID string) ([]types.EquipmentReservationHistory, error)
```

**SQL Queries:**

1. **GetMaintenanceLogs**:
```sql
SELECT 
  ml.id, ml.equipment_id, ml.previous_status, ml.new_status, 
  ml.notes, ml.admin_id, p.username as admin_username, ml.created_at
FROM maintenance_logs ml
LEFT JOIN profiles p ON p.user_id = ml.admin_id
WHERE ml.equipment_id = $1
ORDER BY ml.created_at DESC
```

2. **GetEquipmentReservations**:
```sql
SELECT 
  r.id, r.user_id, p.username, r.start_date, r.end_date, 
  r.status, r.credits, r.created_at
FROM reservations r
LEFT JOIN profiles p ON p.user_id = r.user_id
WHERE r.equipment_id = $1
ORDER BY r.created_at DESC
LIMIT 50
```

---

### 3. Types

#### [MODIFY] `internal/types/equipment.go`

Add new types:

```go
// MaintenanceLog represents a maintenance log entry
type MaintenanceLog struct {
    ID             string        `json:"id"`
    EquipmentID    string        `json:"equipment_id"`
    PreviousStatus *string       `json:"previous_status"`
    NewStatus      string        `json:"new_status"`
    Notes          *string       `json:"notes"`
    AdminID        *string       `json:"admin_id"`
    AdminUsername  *string       `json:"admin_username"`
    CreatedAt      time.Time     `json:"created_at"`
}

// CreateMaintenanceLogInput for creating a new log
type CreateMaintenanceLogInput struct {
    EquipmentID string  `json:"equipment_id"`
    NewStatus   string  `json:"new_status"`
    Notes       *string `json:"notes"`
    AdminID     string  `json:"admin_id"`
}

// EquipmentReservationHistory for equipment's reservation history
type EquipmentReservationHistory struct {
    ID        string    `json:"id"`
    UserID    string    `json:"user_id"`
    Username  string    `json:"username"`
    StartDate string    `json:"start_date"`
    EndDate   string    `json:"end_date"`
    Status    string    `json:"status"`
    Credits   int       `json:"credits"`
    CreatedAt time.Time `json:"created_at"`
}
```

---

### 4. Service Layer

#### [MODIFY] `internal/service/equipment/equipment_service.go`

Add interface methods:

```go
type EquipmentService interface {
    // ... existing methods ...
    
    GetMaintenanceLogs(ctx context.Context, equipmentID string) ([]types.MaintenanceLog, error)
    CreateMaintenanceLog(ctx context.Context, input types.CreateMaintenanceLogInput) (*types.MaintenanceLog, error)
    GetEquipmentReservations(ctx context.Context, equipmentID string) ([]types.EquipmentReservationHistory, error)
}
```

Implement these methods to delegate to repository.

---

### 5. Handler Layer

#### [MODIFY] `internal/handler/equipment/equipment_handler.go`

Add new handlers:

```go
// HandleGetMaintenanceLogs handles GET /equipment/{id}/maintenance-logs
func (h *EquipmentHandler) HandleGetMaintenanceLogs(w http.ResponseWriter, r *http.Request) {
    // 1. Extract equipment ID from URL
    // 2. Call service.GetMaintenanceLogs
    // 3. Return JSON response with maintenance_logs array
}

// HandleCreateMaintenanceLog handles POST /equipment/{id}/maintenance-logs
func (h *EquipmentHandler) HandleCreateMaintenanceLog(w http.ResponseWriter, r *http.Request) {
    // 1. Extract equipment ID, admin ID from context
    // 2. Parse request body for notes
    // 3. Get current equipment status
    // 4. Call service.CreateMaintenanceLog
    // 5. Return created log
}

// HandleGetEquipmentReservations handles GET /equipment/{id}/reservations
func (h *EquipmentHandler) HandleGetEquipmentReservations(w http.ResponseWriter, r *http.Request) {
    // 1. Extract equipment ID from URL
    // 2. Call service.GetEquipmentReservations
    // 3. Return JSON response with reservations array
}
```

---

### 6. Router Registration

#### [MODIFY] `cmd/api/main.go` or router file

Register new routes:

```go
// Equipment maintenance logs
router.HandleFunc("/equipment/{id}/maintenance-logs", authMiddleware(equipmentHandler.HandleGetMaintenanceLogs)).Methods("GET")
router.HandleFunc("/equipment/{id}/maintenance-logs", authMiddleware(equipmentHandler.HandleCreateMaintenanceLog)).Methods("POST")

// Equipment reservation history
router.HandleFunc("/equipment/{id}/reservations", authMiddleware(equipmentHandler.HandleGetEquipmentReservations)).Methods("GET")
```

---

## Response Formats

### GET /equipment/{id}/maintenance-logs

```json
{
  "maintenance_logs": [
    {
      "id": "uuid",
      "equipment_id": "uuid",
      "previous_status": "ok",
      "new_status": "broken",
      "notes": "Camera lens damaged",
      "admin_id": "uuid",
      "admin_username": "admin_user",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### POST /equipment/{id}/maintenance-logs

**Request:**
```json
{
  "notes": "Replaced battery pack"
}
```

**Response:**
```json
{
  "id": "uuid",
  "equipment_id": "uuid",
  "previous_status": "ok",
  "new_status": "ok",
  "notes": "Replaced battery pack",
  "admin_id": "uuid",
  "admin_username": "admin_user",
  "created_at": "2024-01-15T10:30:00Z"
}
```

### GET /equipment/{id}/reservations

```json
{
  "reservations": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "username": "john_doe",
      "start_date": "2024-01-10",
      "end_date": "2024-01-15",
      "status": "RETURNED",
      "credits": 20,
      "created_at": "2024-01-09T14:00:00Z"
    }
  ]
}
```

---

## Authorization

- All endpoints require authentication (Bearer token)
- `GET` endpoints: Any authenticated user (admin or regular)
- `POST /maintenance-logs`: Admin role required

---

## Implementation Order

1. Add types to `types/equipment.go`
2. Add repository methods
3. Add service interface and implementation
4. Add handler methods
5. Register routes
6. Test endpoints

---

## Verification

1. Run `go build ./...` to verify compilation
2. Test endpoints with curl:
   ```bash
   curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/equipment/{id}/maintenance-logs
   curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/equipment/{id}/reservations
   ```
