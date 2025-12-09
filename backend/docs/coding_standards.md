# Backend Coding Standards & Conventions

This document outlines the coding standards, file naming conventions, and project structure guidelines for the Magazyn backend project. Adhering to these rules ensures consistency, readability, and maintainability across the codebase.

## 1. File Naming Conventions

*   **Go Source Files**: Use `snake_case` for all Go file names.
    *   *Correct*: `auth_handler.go`, `user_service.go`, `utils.go`
    *   *Incorrect*: `AuthHandler.go`, `userService.go`, `auth.handler.go`
*   **Test Files**: Test files must end with `_test.go`.
    *   Unit tests should co-locate with the file they verify (e.g., `auth_service_test.go` tests `auth_service.go`).
    *   Integration tests should be suffixed with `_integration_test.go` (e.g., `auth_service_integration_test.go`).
*   **Documentation**: Use `kebab-case` or `snake_case` for markdown files (e.g., `coding_standards.md`, `api-docs.md`).

## 2. Project Structure

We follow a modular structure based on the Standard Go Project Layout, adapted for our needs:

*   **`cmd/`**: Main applications.
    *   `api/`: The entry point for the REST API server (`main.go`).
*   **`internal/`**: Private application and library code. This code is not importable by external projects.
    *   **`handler/`**: HTTP handlers (controllers). Grouped by domain (e.g., `handler/auth/`, `handler/equipment/`).
    *   **`service/`**: Business logic. Grouped by domain (e.g., `service/auth/`, `service/equipment/`).
    *   **`repository/`**: Data access layer. Interfaces defined in `repository/`, concrete implementations in sub-packages (e.g., `repository/supabase/`).
    *   **`middleware/`**: HTTP middleware (e.g., `middleware/auth/`, `middleware/common/`).
    *   **`middleware/`**: HTTP middleware (e.g., `middleware/auth/`, `middleware/common/`).
    *   **`types/`**: shared domain types, DTOs, and error definitions.
    *   **Domain Packages**: Domain-specific constants or types that don't fit in `types` can live in the domain package itself (e.g., `internal/auth/roles.go`).
    *   **`config/`**: Configuration loading and management.
*   **`pkg/`**: Library code that's ok to use by external applications (if any). Currently, most code resides in `internal`.
*   **`docs/`**: Design and user documentation.

### Package Organization
*   **Domain-Driven**: Group code by domain (Auth, Equipment) rather than by layer (all handlers together) where possible, or use a hybrid approach (Layer -> Domain) as we currently do (`handler/auth`, `service/auth`).
*   **Interfaces**: Define interfaces where they are *used* (consumer side) or in a shared `interfaces` package if circular dependencies arise. Currently, we use `repository/interfaces.go` and `service/interfaces.go` for clarity.

## 3. Testing Rules

*   **Placement**:
    *   **Unit Tests**: Place in the same package as the code being tested. Use `package foo` or `package foo_test` (for black-box testing).
    *   **Integration Tests**: Can be in the same package or a separate test package. If utilizing external resources (DB), ensure appropriate mocking or setup/teardown logic.
*   **Naming**: Function names should be descriptive, starting with `Test`. Example: `TestAuthService_Login_Success`.
*   **Mocks**: Use `testify/mock` for generating mocks. Place mocks in `internal/testutils/mocks` or within `_test.go` files if specific to a single package.

## 4. Code Style & Best Practices

*   **Formatting**: Always run `go fmt` before committing.
*   **Linting**: Use `golangci-lint` to catch common errors.
*   **Error Handling**:
    *   Return errors rather than panicking.
    *   Use custom error types (defined in `internal/types/errors.go`) for domain-specific errors (NotFound, Conflict, etc.).
    *   Wrap errors with context when propagating them up the stack (e.g., `fmt.Errorf("failed to create user: %w", err)`).
*   **Logging**: Use the internal `logger` package (`slog` wrapper). Do not use `fmt.Println` in production code.
*   **Configuration**: Do not hardcode secrets or configuration. Use the `config` package to read from environment variables or `.env` files.
