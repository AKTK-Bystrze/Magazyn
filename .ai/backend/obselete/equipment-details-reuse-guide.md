# Equipment Details - Existing Endpoint Reuse Guide

## Overview

This guide explains how to use **existing endpoints** for functionality originally proposed as new endpoints. These implementations already exist in the codebase and should be reused to avoid code duplication per the DRY principle.

---

## 1. Maintenance Logs for Equipment

### ❌ Originally Proposed
```
GET /equipment/{id}/maintenance-logs
```

### ✅ Use Instead
```
GET /equipment/{id}
```

### Implementation Details

The equipment detail endpoint already returns maintenance logs as part of the response.

**Existing Code Location:**
- Handler: [equipment_handler.go](file:///e:/bystrze/Magazyn/backend/internal/handler/equipment/equipment_handler.go) → `HandleGetByID`
- Service: [equipment_service.go](file:///e:/bystrze/Magazyn/backend/internal/service/equipment/equipment_service.go#L145-L191) → `GetByID`
- Repository: [equipment_repository.go](file:///e:/bystrze/Magazyn/backend/internal/repository/supabase/equipment_repository.go#L265) → `GetMaintenanceLogsWithAdmin`

**Response Structure:**
```json
{
  "id": "equipment-uuid",
  "internal_id": "CAM-001",
  "type_name": "Camera",
  "status": "ok",
  "maintenance_logs": [
    {
      "id": "log-uuid",
      "previous_status": "broken",
      "new_status": "ok",
      "notes": "Replaced lens",
      "admin_username": "admin_user",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Frontend Usage Example:**
```typescript
// Instead of calling a separate endpoint
const { data } = await api.get(`/equipment/${equipmentId}`);
const maintenanceLogs = data.maintenance_logs;
```

---

## 2. Reservation History for Equipment

### ❌ Originally Proposed
```
GET /equipment/{id}/reservations
```

### ✅ Use Instead
```
GET /reservations?equipment_id={id}&scope=all
```

### Implementation Details

The reservations list endpoint supports filtering by `equipment_id`.

**Existing Code Location:**
- Handler: [reservation_handler.go](file:///e:/bystrze/Magazyn/backend/internal/handler/reservation/reservation_handler.go#L28-L87) → `HandleList`
- Query filter: Lines 52-54

**Supported Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `equipment_id` | Filter by equipment UUID |
| `status` | Filter by reservation status (PENDING, RENTED, RETURNED, DENIED) |
| `scope` | `all` = all reservations, `my` = user's own reservations |
| `page`, `per_page` | Pagination |
| `start_date_from`, `start_date_to` | Date range filters |

**Response Structure:**
```json
{
  "reservations": [
    {
      "id": "reservation-uuid",
      "user_id": "user-uuid",
      "username": "john_doe",
      "equipment_id": "equipment-uuid",
      "equipment_name": "Camera Kit A",
      "start_date": "2024-01-10",
      "end_date": "2024-01-15",
      "status": "RETURNED",
      "credits": 20,
      "created_at": "2024-01-09T14:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 5,
    "total_pages": 1
  }
}
```

**Frontend Usage Example:**
```typescript
// Get all reservations for a specific piece of equipment
const { data } = await api.get('/reservations', {
  params: {
    equipment_id: equipmentId,
    scope: 'all',
    per_page: 50
  }
});
const reservationHistory = data.reservations;
```

---

## Summary

| Original Proposal | Reuse Instead | Benefit |
|-------------------|---------------|---------|
| `GET /equipment/{id}/maintenance-logs` | `GET /equipment/{id}` | Logs included in detail response |
| `GET /equipment/{id}/reservations` | `GET /reservations?equipment_id={id}` | Full filtering, pagination support |

> [!TIP]
> By reusing existing endpoints, we maintain a single source of truth for data access and avoid synchronization issues between duplicate implementations.
