# Magazyn Backend Developer Guide

A dense, precise reference for backend architecture, security, and conventions.

## 1. Architecture & Layers

The backend uses a strict **Layered Architecture** with Constructor Injection.

- **`cmd/api/main.go`**: Entry point. Bootstraps config, instantiates repositories/services/handlers, wires dependencies, and mounts standard `net/http` `ServeMux` routes.
- **`internal/handler/`**: Transport layer. Parses HTTP requests, validates constraints, calls services, writes HTTP responses. Never contains business logic.
- **`internal/service/`**: Business logic layer. Pure Golang. Orchestrates repositories. Agnostic of HTTP or DB drivers.
- **`internal/repository/`**: Data Access layer. Concrete implementations interact with Supabase (e.g., `supabase/equipment_repository.go`).
- **`internal/types/`**: Domain types and DTOs shared across layers.

## 2. Authentication & Authorization

- **Middleware Flow**: Requests pass through `cors` -> `auth` -> `rbac`.
- **`auth_middleware.go`**: Validates JWTs received in the `Authorization: Bearer` header. Extracts user info via `gotrue-go` and injects contexts.
- **Roles**: Enforced using `rbac_middleware.go` wrappers on routes (e.g., `RequireRoles(auth.RoleAdmin)`).

### Context Key Access Pattern

Extract context values in handlers using these explicit type assertions:

```go
user    := r.Context().Value(appcontext.UserContextKey).(*types.User)
profile := r.Context().Value(appcontext.UserProfileContextKey).(*types.PublicProfilesSelect)
token   := r.Context().Value(appcontext.AccessTokenContextKey).(string)
```

### Auth Access Control Table

| Endpoint Pattern                                                                                                                             | Required Roles         | Special Rules                                   |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------- |
| `GET /health`                                                                                                                                | Public                 | Unauthenticated health check.                   |
| `POST /auth/login`                                                                                                                           | Public                 | Unauthenticated login.                          |
| `GET /auth/session`                                                                                                                          | Any authenticated      | **Only** endpoint accessible by disabled users. |
| `POST /auth/logout`                                                                                                                          | Any authenticated      | Must be enabled.                                |
| `GET /users/me`, `GET /users/public`, `GET /users/credits`                                                                                   | Any authenticated      | Must be enabled.                                |
| `GET /users`, `GET /users/{id}`                                                                                                              | `admin`, `super_admin` | Must be enabled.                                |
| `POST /users`, `PATCH /users/{id}`, `POST /users/bulk-adjust-credits`                                                                        | `super_admin`          | Must be enabled.                                |
| `GET /equipment`, `GET /equipment/{id}`, `GET /equipment/{id}/availability`, `GET /equipment-types`, `POST /equipment/{id}/maintenance-logs` | Any authenticated      | Must be enabled.                                |
| `POST /equipment`, `PATCH /equipment/{id}`, `DELETE /equipment/{id}`                                                                         | `admin`, `super_admin` | Must be enabled.                                |
| `GET /reservations`, `POST /reservations`, `GET /reservations/{id}`, `PATCH /reservations/{id}`                                              | Any authenticated      | Must be enabled.                                |
| `GET /reservations/dashboard`, `PATCH /reservations/bulk`                                                                                    | `admin`, `super_admin` | Must be enabled.                                |
| `GET /calendar/availability`                                                                                                                 | Any authenticated      | Must be enabled.                                |
| `GET /credits/history`, `GET /credits/requests`, `POST /credits/requests`, `PUT /credits/requests/{id}`                                      | Any authenticated      | Must be enabled.                                |
| `PATCH /credits/requests/{id}/status`                                                                                                        | `super_admin`          | Must be enabled.                                |
| `GET /analytics/*`                                                                                                                           | `admin`, `super_admin` | Must be enabled.                                |

## 3. Database & Supabase Interaction

- **Clients**: Uses `supabase-go` (for PostgREST data fetching) and `gotrue-go` (for Auth operations).
- **Service Role vs Anon Key**:
  - Standard operations use the user's JWT + Anon Key to leverage Supabase Row Level Security (RLS).
  - Privileged backend operations use the `SUPABASE_SERVICE_ROLE_KEY` (e.g., bypassing RLS to create users).
- **Atomic Operations**: Complex multi-table mutations are implemented as PostgreSQL Stored Procedures and called via Supabase RPC.

## 4. Input Validation & Security

**Checklist for new endpoints:**

1. UUID parameters validated?
2. Dates validated?
3. Enums validated against constants?
4. Search strings length checked?
5. Search strings sanitized before PostgREST ILIKE?

### Validation API Surface (`internal/validation`)

- `SanitizeSearchTerm(term string) string` - Escapes `, . ( ) = * !` to prevent PostgREST injection. **CRITICAL: use for all `ILIKE` inputs.**
- `ValidateUUID(id string) error` - Ensures valid 8-4-4-4-12 UUID format.
- `ValidateEnum(val string, allowed []string) error` - e.g., `validation.ValidateEnum(status, constants.ValidEquipmentStatuses)`.
- `ValidateStringLength(str string, min, max int) error` - e.g., `validation.ValidateStringLength(search, 0, constants.MaxSearchLength)`.
  _(Note: Dates are validated and parsed using Go's standard `time.Parse(constants.DateFormatISO, ...)`)._

## 5. Coding Standards

- **File Naming**: `snake_case.go` for all files. Test files suffix with `_test.go` or `_integration_test.go`.
- **Error Handling**:
  1. Repositories wrap low-level errors (`fmt.Errorf("...: %w", err)`).
  2. Services return structured types like `types.NewNotFoundError("message")`.
  3. Handlers map domain errors to standard HTTP status codes via `http_utils.go`.
- **Contexts**: `context.Context` must be passed down from handlers to all service and repository functions for cancellation tracking and context injection.

## 6. Test Infrastructure & Centralized Mocks

Test scaffolding is centralized under `backend/internal/testutils/` to ensure consistency and eliminate duplicate mock implementations:

- Centralized Mocks (`internal/testutils/mocks/`)
- Context & Request Helpers (`internal/testutils/helpers.go`)

## 7. Extension Points

### 7.1 Adding a New Domain Entity
1. **Types**: Define database entity models and API DTOs in `internal/types/`.
2. **Repository**: Declare the interface in `internal/repository/{domain}.go` and implement it in `internal/repository/supabase/{domain}_repository.go`.
3. **Service**: Define business interfaces and logic in `internal/service/{domain}/`.
4. **Handler**: Create HTTP transport handlers and query binders in `internal/handler/{domain}/`, mapping domain errors via `http_utils.go`.
5. **Wireup**: Register dependencies via constructor injection in `cmd/api/main.go` and mount routes on `http.ServeMux`.

### 7.2 Adding a New Database Stored Procedure / RPC
1. **Migration**: Create a versioned migration in `supabase/migrations/YYYYMMDDHHMMSS_name.sql` using PostgreSQL transactions and `SECURITY DEFINER`.
2. **Parameters & Results**: Define request/response DTOs in `internal/types/`.
3. **Repository RPC Wrapper**: Implement the execution call in `internal/repository/supabase/{domain}_repository_rpc.go`.
4. **Service Integration**: Invoke the repository method inside the appropriate sub-service (e.g. `reservation_service_create.go`), handling transaction rollback and domain errors.
5. **Mock Scaffolding**: Mirror the method signature on the relevant mock in `internal/testutils/mocks/`.

### 7.3 Adding a Notification Channel
1. **Interface**: Implement or extend the notification provider in `internal/service/email/`.
2. **Injection**: Pass the notification provider into the target service constructor in `cmd/api/main.go`.
3. **Detached Execution**: Dispatch notifications asynchronously using detached contexts (`context.WithoutCancel(ctx)`) so client disconnections do not abort notifications.

## 8. Cross-References

- [API Reference Documentation](../overview/api.md) — REST routes, query contracts, and BFF proxying.
- [Database Schema & RPC Documentation](../database/db-doc.md) — Stored procedures, tables, triggers, and RLS policies.
- [Reservation Workflow](../flows/reservation-flow.md) — End-to-end lifecycle, status state machine, and pricing calculations.
- [Detailed Architecture](../overview/detailed-architecture.md) — Monorepo layers, middleware, and Mermaid architecture diagrams.
