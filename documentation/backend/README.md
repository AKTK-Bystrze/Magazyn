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
| Endpoint Pattern | Required Roles | Special Rules |
|-----------------|----------------|---------------|
| `/auth/session` | Any authenticated | **Only** endpoint accessible by disabled users. |
| `/auth/*` (other) | Any authenticated | Must be enabled. |
| `/equipment/*` | Any authenticated | Must be enabled. |
| `/admin/*` | `admin`, `super_admin` | Must be enabled. |
| `/admin/users/*` | `super_admin` | Must be enabled. |

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
- `ValidateISODate(date string) error` - Ensures YYYY-MM-DD.
- `ValidateEnum(val string, allowed []string) error` - e.g., `validation.ValidateEnum(status, constants.ValidEquipmentStatuses)`.
- `ValidateStringLength(str string, min, max int) error` - e.g., `validation.ValidateStringLength(search, 0, constants.MaxSearchLength)`.

## 5. Coding Standards
- **File Naming**: `snake_case.go` for all files. Test files suffix with `_test.go` or `_integration_test.go`.
- **Error Handling**: 
  1. Repositories wrap low-level errors (`fmt.Errorf("...: %w", err)`). 
  2. Services return structured types like `types.NewNotFoundError("message")`. 
  3. Handlers map domain errors to standard HTTP status codes via `http_utils.go`.
- **Contexts**: `context.Context` must be passed down from handlers to all service and repository functions for cancellation tracking and context injection.
