# Backend Clearing Plan

## Objective
Clean up the backend codebase by removing duplicated files, improving package isolation, and updating documentation to match the new structure.

## Phase 1: Structure Cleanup
- [x] Remove empty `backend/internaltestutils` directory.
- [ ] Remove any incorrectly created empty directories in `repository` (if any).

## Phase 2: Package Refactoring
Isolate components into dedicated sub-packages to enforce better separation of concerns.

### Handlers (`internal/handler`)
- **Action**: Create sub-directories `auth`, `equipment`, `common`.
- **Moves**:
  - `auth.handler.go`, `auth_handler_test.go` -> `internal/handler/auth/`
  - `equipment.handler.go` -> `internal/handler/equipment/`
  - `http_utils.go` -> `internal/handler/common/`

### Services (`internal/service`)
- **Action**: Create sub-directories `auth`, `equipment`, `common`.
- **Moves**:
  - `auth.service.go`, `auth_service_test.go`, `auth_service_integration_test.go` -> `internal/service/auth/`
  - `equipment.service.go`, `equipment_service_test.go` -> `internal/service/equipment/`
  - `adapters.go` -> `internal/service/common/`

### Repositories (`internal/repository`)
- **Status**: **UNCHANGED**. Interfaces remain in root, implementations in `supabase/`.

## Phase 3: Code & Documentation Adjustments
- [ ] **Package Declarations**: Update `package` clause in moved files (e.g., `package handler` -> `package auth`).
- [ ] **Imports**: Fix imports throughout the application (handlers, main.go, etc.) to point to new paths.
- [ ] **Documentation**: Update `backend/docs/index.md` to reflect the new nested structure.

## Phase 4: Verification
- [ ] Run `go mod tidy` to clean up dependencies.
- [ ] Run `go build ./cmd/api` to verify compilation.
- [ ] Run `go test ./...` to verify functionality.
