# Reservation API Implementation Report & Next Steps

## 1. Current Status Review

**Implemented:**
- Core Endpoints: List, GetByID, Create, Update, BulkUpdate, Dashboard.
- Data Models & DTOs matching the frontend requirements.
- Atomic Creation (RPC call structure usage).
- Architectural Compliance (Layered structure, Dependency Injection).
- Documentation Standards (Godoc present).

**Missing / Incomplete:**
1.  **Email Notifications**: Indicated by `// TODO: Send Email (Async)` in `reservation_service.go`. No implementation currently exists.
2.  **Refund Logic**: Cancellation (Status -> `DENIED`) does not trigger credit refunds. Comments acknowledge need (`// Refund logic needed`), but logic is absent.
3.  **Code Quality**:
    - **Hardcoded Strings**: Roles `"admin"` and `"super_admin"` are hardcoded in Service and Handler layers.
    - **DRY Principle**: `reservation_repository.go` defines inline structs (`joinedResponse`, `detailResponse`) that could be consolidated if reused or moved to file scope for clarity.

## 2. Implementation Suggestions

### A. Feature Completion

#### 1. Email Notifications
**Action**: Implement `EmailService` integration.
- **Interface**: Ensure `EmailService` interface exists (e.g., in `internal/service/email/`) with a method like `SendReservationConfirmation`.
- **Injection**: Add `EmailService` field to `reservationService` struct and update `NewReservationService`.
- **Implementation**:
    - In `Create` method, after successful transaction, call `s.emailService.SendReservationConfirmation`.
    - Use `go` routine for async execution if immediate consistency isn't required for the email delivery itself.

#### 2. Refund Logic
**Action**: Implement credit refunds on cancellation.
- **Database**: Ensure a Supabase RPC function (e.g., `refund_reservation_credits`) exists to handle the balance update atomically.
- **Repository**: Add `RefundCredits(ctx context.Context, reservationID string, amount int32) error` to `ReservationRepository`.
- **Service**: 
    - In `Update` method, detect status change to `DENIED`.
    - Calculate the refund amount based on the reservation's credit cost.
    - Call `repo.RefundCredits`.

### B. Code Quality Refactoring

#### 1. Hardcoded Strings
**Action**: centralized constants.
- **File**: `internal/constants/constants.go` or `internal/auth/roles.go`.
- **Define**:
  ```go
  const (
      RoleAdmin      = "admin"
      RoleSuperAdmin = "super_admin"
      RoleUser       = "user"
  )
  ```
- **Apply**: Replace all occurrences of `"admin"` and `"super_admin"` in `reservation_service.go` and `reservation_handler.go` with these constants.

#### 2. DRY & Structs
**Action**: Clean up Repository.
- Move inline structs (e.g., `joinedResponse`) to the top level of `reservation_repository.go` (private types) or to `internal/types/database.types.go` if they represent reusable projection shapes.

## 3. Testing Strategy

### Unit Tests (`reservation_service_test.go`)
Focus on business logic and permissions without DB dependencies.
1.  **Mocking**: Use `testify/mock` to create mocks for `ReservationRepository` and `EquipmentRepository`.
2.  **Test Cases**:
    - **Create**:
        - `Success`: Valid inputs -> Logic calculates cost -> calls `CreateReservationsAtomic`.
        - `Validation Failure`: Invalid equipment/dates -> Returns `ValidationError` -> Repo NOT called.
    - **Update**:
        - `Permission Denied`: User updates another's reservation -> Returns `ForbiddenError`.
        - `Refund Trigger`: Status change to `DENIED` -> Verifies `RefundCredits` (mock) is called.
    - **View**:
        - `Permission`: User requests ID -> Service checks ownership -> Returns data or Forbidden.

### Integration Tests (`reservation_integration_test.go`)
Focus on correct SQL generation and Supabase interaction.
1.  **Environment**: Requires a running Supabase instance or local Postgres compatible mock.
2.  **Test Cases**:
    - **Atomic Creation**: Create reservation -> Check DB for row AND check `profiles` table for credit deduction.
    - **Filtering**: Insert 3 reservations (pending, rented, denied) -> Call `GetReservations` with status filter -> Assert correct count.
    - **Overlaps**: Insert reservation A -> Try inserting reservation B on same dates -> Assert failure (if constraint is enforced) or `GetOverlappingReservations` returns it.
