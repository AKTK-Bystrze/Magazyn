# Backend Project Structure

This document provides an overview of the backend project structure and key directories.

## Directory Layout

### Root Directory (`backend/`)
- **`cmd/api/`**: Contains the main entry point for the application.
  - `main.go`: Bootstraps the application, loads config, wiring services/repositories, and starts the HTTP server.
- **`docs/`**: Project documentation.
  - [Coding Standards](./coding_standards.md)
  - [Architecture & Design Patterns](./architecture.md)

### Internal Packages (`backend/internal/`)
The `internal` directory contains the core application code, strictly separated by concern.

- **`appcontext/`**: Defines context keys used to pass data (like User Identity) through the request lifecycle.
- **`auth/`**: Contains authentication-related constants and role definitions.
- **`config/`**: Handles configuration loading (`PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- **`constants/`**: Shared application constants (e.g., pagination defaults, reservation statuses).
- **`handler/`**: HTTP Handlers (Controllers) responsible for parsing requests and writing responses.
  - **`auth/`**: Authentication handlers (`auth.handler.go`).
  - **`equipment/`**: Equipment management handlers (`equipment.handler.go`).
  - **`common/`**: Shared HTTP utilities.
- **`logger/`**: Structured logging utility wrapping `slog`.
- **`middleware/`**: HTTP Middleware components.
  - **`auth/`**: Authentication and RBAC middleware (`auth.middleware.go`, `rbac.middleware.go`).
  - **`common/`**: General middleware like CORS (`cors.middleware.go`).
- **`repository/`**: Data Access Layer.
  - `interfaces.go`: Currently interfaces are defined in domain files like `auth.go`, `equipment.go`, `user.go`, `reservation.go`, `credit_history.go`.
  - `supabase/`: Concrete implementations using the Supabase Go client.
- **`service/`**: Business Logic Layer.
  - **`auth/`**: Authentication services (`auth.service.go`).
  - **`equipment/`**: Equipment domain services (`equipment.service.go`).
  - **`common/`**: Shared service adapters (`adapters.go`).
- **`types/`**: Domain types, DTOs (Data Transfer Objects), and Errors.
  - `auth.types.go`: Domain `User` struct.
  - `equipment.types.go`: specific equipment structs.
  - `errors.go`: Custom error types (`NotFoundError`, `ConflictError`).
  - `database.types.go`: Generated Supabase DB types.
- **`testutils/`**: Utilities for testing.

## Key Architectural Patterns
- **Repository Pattern**: Data access is decoupled via interfaces in `repository/`, allowing easy swapping of database implementations and mocking for tests.
- **Dependency Injection**: Services and Handlers receive their dependencies (repositories, other services) via constructors in `main.go`.
- **Service Layer**: Business logic resides strictly in `service/`, not in handlers.
