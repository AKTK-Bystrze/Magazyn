# API Endpoint Implementation Plan: Equipment Types

## 1. Endpoint Overview
- **Purpose**: Manage equipment categories (e.g., Kayak, Paddle) with a standardized daily credit cost.
- **Resources**: `equipment_types` table (see `db-plan.md`).
- **Endpoints**:
  - `GET /equipment-types` – list all equipment types.
  - `POST /equipment-types` – create a new equipment type (Admin/SuperAdmin only).

## 2. Request Details
### HTTP Methods & URLs
- **GET** `/equipment-types`
- **POST** `/equipment-types`

### Parameters
- **GET**: No query parameters.
- **POST**:
  - **Body (JSON)**:
    ```json
    {
      "name": "Helmet",
      "credit_cost_per_day": 1
    }
    ```
  - **Required**: `name`, `credit_cost_per_day`.
  - **Optional**: none.

### DTO / Command Models
- **Go (backend)**:
  ```go
  type PublicEquipmentTypesSelect struct {
    CreatedAt string `json:"created_at"`
    CreditCostPerDay int32 `json:"credit_cost_per_day"`
    Id string `json:"id"`
    Name string `json:"name"`
  }

  type PublicEquipmentTypesInsert struct {
    CreatedAt *string `json:"created_at"`
    CreditCostPerDay int32 `json:"credit_cost_per_day"`
    Id *string `json:"id"`
    Name string `json:"name"`
  }

  type PublicEquipmentTypesUpdate struct {
    CreatedAt *string `json:"created_at"`
    CreditCostPerDay *int32 `json:"credit_cost_per_day"`
    Id *string `json:"id"`
    Name *string `json:"name"`
  }
  ```
- **TypeScript (frontend)** (generated from Supabase types):
  ```ts
  export type EquipmentType = {
    id: string;
    name: string;
    credit_cost_per_day: number;
    created_at: string;
  };
  ```

## 3. Response Details
### GET /equipment-types (200 OK)
```json
{
  "equipment_types": [
    {
      "id": "uuid",
      "name": "Kayak",
      "credit_cost_per_day": 4,
      "created_at": "2025-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "name": "Paddle",
      "credit_cost_per_day": 2,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```
### POST /equipment-types (201 Created)
```json
{
  "id": "uuid",
  "name": "Helmet",
  "credit_cost_per_day": 1,
  "created_at": "2025-11-27T19:56:29Z"
}
```
### Error Responses (common)
- `400 Bad Request` – validation errors.
- `401 Unauthorized` – missing/invalid JWT.
- `403 Forbidden` – user lacks Admin/SuperAdmin role.
- `409 Conflict` – duplicate `name`.
- `500 Internal Server Error` – unexpected failures.

## 4. Data Flow
1. **HTTP Request** → **Go API Router** (mux/chi).
2. **Auth Middleware** verifies Supabase JWT and injects user role.
3. **Authorization Check** (`role == admin || role == super_admin`).
4. **Validation Layer** (struct tags + custom validator).
5. **Service Layer** (`EquipmentTypeService`):
   - `ListAll()` – SELECT from `equipment_types`.
   - `Create(dto)` – INSERT with `RETURNING *`.
6. **Repository Layer** (uses `pgx` or Supabase client) interacts with PostgreSQL.
7. **Response Mapper** converts DB rows to DTOs → JSON.
8. **Error Logger** writes structured logs to the central error table (if configured) and returns sanitized error messages.

## 5. Security Considerations
- **Authentication**: All endpoints require a valid Supabase JWT (checked by middleware).
- **Authorization**: POST is restricted to `admin` and `super_admin` roles.
- **Input Validation**: `name` length capped at 100 characters, `credit_cost_per_day` must be integer ≥ 0.
- **Unique Constraint**: DB enforces `UNIQUE(name)` – handle conflict gracefully.
- **Rate Limiting**: Apply generic API rate limits (e.g., 60 req/min per IP) to mitigate brute‑force.
- **Logging**: Do not log raw request bodies; log only sanitized fields and error codes.
- **CORS**: Allow only trusted origins (frontend URL).

## 6. Error Handling
| Scenario | Status | Reason | Action |
|---|---|---|---|
| Missing/invalid JWT | 401 | `Unauthorized` | Return generic message, no details. |
| User role not admin | 403 | `Forbidden` | Return generic forbidden message. |
| Validation fails (empty name, negative cost) | 400 | `Bad Request` | Return field‑level errors. |
| Duplicate name (DB unique violation) | 409 | `Conflict` | Return conflict with offending field. |
| DB connectivity issue | 500 | `Internal Server Error` | Log stack trace, return generic error. |
| Unexpected panic | 500 | `Internal Server Error` | Recover middleware, log, return generic error. |

## 7. Performance Considerations
- **Indexes**: Primary key (`id`) indexed; `name` has a unique index for fast conflict detection.
- **Read‑only GET**: Can be cached at CDN edge (e.g., Vercel/Cloudflare) for a short TTL (≈30 s) because equipment types change rarely.
- **Connection Pooling**: Use pgx pool (max ≈ 10 connections).
- **Batch Inserts**: Not required now, but service can support bulk creation later.

## 8. Implementation Steps
1. **Create Service** `backend/internal/service/equipment_type_service.go` with `ListAll(ctx)` & `Create(ctx, dto)`. Use repository pattern.
2. **Add Repository** `backend/internal/repository/equipment_type_repo.go` handling SELECT & INSERT RETURNING.
3. **Define DTOs** (if missing) in `backend/internal/types/equipment_type.types.go` using the structs from `database.types.go`.
4. **Update Router** (`backend/internal/router.go` or similar) to register:
   - `GET /equipment-types` → handler `ListEquipmentTypes`.
   - `POST /equipment-types` → handler `CreateEquipmentType` (with auth middleware).
5. **Implement Validation** (go‑playground/validator):
   - `name` required, max = 100, alphanumeric + spaces.
   - `credit_cost_per_day` required, min = 0.
6. **Add Authorization Checks** in POST handler: abort with 403 if role ≠ admin/super_admin.
7. **Error Mapping**: Convert DB unique‑violation (`pq: duplicate key value violates unique constraint "equipment_types_name_key"`) to 409 Conflict.
8. **Logging**: Use structured logger (zap) with fields `endpoint`, `user_id`, `error_code`.
9. **Write Tests**:
   - Unit tests for service (mock DB).
   - Integration tests for handlers (httptest) covering success, validation, auth, conflict.
10. **Update Frontend Types**: Run Supabase codegen or manually add `EquipmentType` type to `frontend/src/db/database.types.ts`.
11. **Add Frontend API Calls** (if needed) via a React hook using TanStack Query.
12. **Run Linter & Format** (`golangci-lint`, `prettier`).
13. **Deploy**: Rebuild Docker image, ensure new binaries are included; no migration needed for this table.
14. **Verification**:
    - Hit GET endpoint, verify list.
    - POST with admin token, verify 201 response.
    - POST with regular user, expect 403.
    - Duplicate name, expect 409.
    - Review logs for structured entries.

---
*All steps follow the project’s tech stack (Go backend, Supabase Postgres, Astro/React frontend) and respect the implementation rules (`@shared.mdc`, `@backend.mdc`, `@astro.mdc`).*
