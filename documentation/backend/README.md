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
- **`auth_middleware.go`**: Validates JWTs received in the `Authorization: Bearer` header. Extracts user info via `gotrue-go` and injects `UserContextKey` and `ProfileContextKey` into the request context.
- **Roles**: Enforced using `rbac_middleware.go` wrappers on routes (e.g., `RequireRoles(auth.RoleAdmin)`).

## 3. Database & Supabase Interaction
- **Clients**: Uses `supabase-go` (for PostgREST data fetching) and `gotrue-go` (for Auth operations).
- **Service Role vs Anon Key**: 
  - Standard operations use the user's JWT + Anon Key to leverage Supabase Row Level Security (RLS).
  - Privileged backend operations use the `SUPABASE_SERVICE_ROLE_KEY` (e.g., bypassing RLS to create users or handle automated tasks).
- **Atomic Operations**: Complex multi-table mutations (e.g., `create_reservation_atomic`, `refund_reservation_credits`) are implemented as PostgreSQL Stored Procedures and called via Supabase RPC. Standard REST does not support explicit `BEGIN`/`COMMIT` transactions.

## 4. Input Validation & Security
- **PostgREST Injection Protection**: ALWAYS sanitize user input used in `ILIKE` clauses using `validation.SanitizeSearchTerm()`. Failing to do so allows operators (like `.eq.`) to execute maliciously.
- **UUID Validation**: Validate ID parameters with `validation.ValidateUUID(id)`.
- **Date Validation**: Use `validation.ValidateISODate(date)` and `validation.ValidateDateRange(start, end)`.

## 5. Coding Standards
- **File Naming**: `snake_case.go` for all files. Test files suffix with `_test.go` or `_integration_test.go`.
- **Error Handling**: 
  1. Repositories wrap low-level errors (`fmt.Errorf("...: %w", err)`). 
  2. Services return structured types like `types.NewNotFoundError("message")`. 
  3. Handlers map domain errors to standard HTTP status codes via `http_utils.go`.
- **Contexts**: `context.Context` must be passed down from handlers to all service and repository functions for cancellation tracking and context injection.
