# Backend Tests Report & Improvement Plan

This document provides a comprehensive analysis of the current test coverage in the backend codebase and a detailed plan to achieve 80% test coverage, focusing on functionality and integration tests to prepare for backend refactoring.

## Current State Analysis

### Coverage Summary

| Metric | Value |
|--------|-------|
| **Total Coverage** | 18.3% |
| **Test Files** | 15 |
| **Total Functions** | ~220 |

### Existing Test Files

| File | Scope | Type |
|------|-------|------|
| [roles_test.go](file:///e:/bystrze/Magazyn/backend/internal/auth/roles_test.go) | Auth roles | Unit |
| [auth_handler_test.go](file:///e:/bystrze/Magazyn/backend/internal/handler/auth/auth_handler_test.go) | Auth handler | Unit |
| [credit_handler_test.go](file:///e:/bystrze/Magazyn/backend/internal/handler/credit/credit_handler_test.go) | Credit handler | Unit |
| [auth_middleware_integration_test.go](file:///e:/bystrze/Magazyn/backend/internal/middleware/auth/auth_middleware_integration_test.go) | Auth middleware | Integration |
| [auth_middleware_test.go](file:///e:/bystrze/Magazyn/backend/internal/middleware/auth/auth_middleware_test.go) | Auth middleware | Unit |
| [rbac_middleware_test.go](file:///e:/bystrze/Magazyn/backend/internal/middleware/auth/rbac_middleware_test.go) | RBAC middleware | Unit |
| [auth_service_integration_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/auth/auth_service_integration_test.go) | Auth service | Integration |
| [auth_service_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/auth/auth_service_test.go) | Auth service | Unit |
| [analytics_service_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/calendar/analytics_service_test.go) | Analytics service | Unit |
| [calendar_service_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/calendar/calendar_service_test.go) | Calendar service | Unit |
| [credit_service_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/credit/credit_service_test.go) | Credit service | Unit |
| [equipment_service_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/equipment/equipment_service_test.go) | Equipment service | Unit |
| [reservation_integration_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/reservation/reservation_integration_test.go) | Reservation service | Integration |
| [reservation_service_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/reservation/reservation_service_test.go) | Reservation service | Unit |
| [user_service_test.go](file:///e:/bystrze/Magazyn/backend/internal/service/user/user_service_test.go) | User service | Unit |

---

## Coverage by Layer

### 1. Handlers (0% Coverage)

All HTTP handlers currently have **0% test coverage**. This is the most critical gap.

| Handler | Methods | Coverage |
|---------|---------|----------|
| `auth_handler.go` | `HandleLogin`, `HandleLogout`, `HandleGetSession` | 0-100% (partial) |
| `equipment_handler.go` | 10 methods | 0% |
| `reservation_handler.go` | 6 methods | 0% |
| `user_handler.go` | 5 methods | 0% |
| `calendar_handler.go` | 2 methods | 0% |
| `credit_handler.go` | `HandleGetCreditHistory` | 79.4% |

### 2. Services (Variable Coverage)

| Service | Methods Tested | Coverage |
|---------|---------------|----------|
| Auth | `Login`, `GetSession` | 75-100% |
| Auth | `VerifyOTP`, `Logout` | 0% |
| Equipment | `Create`, `Archive`, `CheckAvailability` | 70-77% |
| Equipment | `List`, `GetByID`, `Update`, `ListEquipmentTypes` | 0% |
| Reservation | `Create` | 85.7% |
| Reservation | `Update` | 44.8% |
| Reservation | `List`, `GetByID`, `BulkUpdate`, `GetDashboardStats` | 0% |
| User | `GetProfile`, `mapToUserResponse` | 100% |
| User | `CreateUser`, `UpdateUser` | 77-88% |
| User | `BulkAdjustCredits`, `ListUsers` | 66.7% |
| Credit | `GetCreditHistory` | 88.5% |
| Calendar | `GetCalendarAvailability` | 92.3% |
| Analytics | `GetEquipmentStats`, `GetUserStats` | 80-82% |

### 3. Middleware (96-100% Coverage)

| Middleware | Coverage |
|------------|----------|
| `auth_middleware.go` | 96.7% |
| `rbac_middleware.go` | 100% |
| `cors_middleware.go` | 0% |

### 4. Repositories (0% Coverage)

All Supabase repository implementations have **0% test coverage**. This is expected as they require database integration.

---

## Test Improvement Plan

### Phase 1: Service Layer Unit Tests (Priority: HIGH)

**Goal**: Achieve 80%+ coverage on all service methods

#### 1.1 Auth Service - Missing Tests

| Method | Test Cases Needed |
|--------|-------------------|
| `VerifyOTP` | Success, invalid OTP, profile not found, RLS error |
| `Logout` | Success, token error |

#### 1.2 Equipment Service - Missing Tests

| Method | Test Cases Needed |
|--------|-------------------|
| `List` | Success with pagination, favorites, filters, empty result |
| `GetByID` | Success with maintenance logs, not found, type lookup error |
| `Update` | Success, not found, validation error, conflict |
| `ListEquipmentTypes` | Success, empty list |
| `CreateEquipmentType` | Success, validation error, duplicate |
| `CreateMaintenanceLog` | Success, equipment not found |

#### 1.3 Reservation Service - Missing Tests

| Method | Test Cases Needed |
|--------|-------------------|
| `List` | Success with filters, pagination, scope handling, RLS bypass |
| `GetByID` | Success, not found, forbidden (ownership check) |
| `Update` (extend) | Date modification, credit refund scenarios, status transitions |
| `BulkUpdate` | Batch status change, partial failure |
| `GetDashboardStats` | Success, empty data |

#### 1.4 User Service - Extend Tests

| Method | Test Cases Needed |
|--------|-------------------|
| `BulkAdjustCredits` | Extend: validation, partial failure |
| `ListUsers` | Extend: filter combinations |

---

### Phase 2: Handler Integration Tests (Priority: HIGH)

**Goal**: Test HTTP request/response cycle with mocked services

#### 2.1 Equipment Handler Tests

```go
// New file: internal/handler/equipment/equipment_handler_test.go
```

| Handler | Test Cases |
|---------|------------|
| `HandleList` | Valid request, pagination, filters, auth error |
| `HandleGetByID` | Success, not found, invalid ID |
| `HandleCreate` | Success, validation error, type not found |
| `HandleUpdate` | Success, not found, forbidden |
| `HandleArchive` | Success, not found, has reservations |
| `HandleCheckAvailability` | Available, unavailable, invalid dates |
| `HandleListEquipmentTypes` | Success |
| `HandleCreateEquipmentType` | Success, duplicate |
| `HandleCreateMaintenanceLog` | Success, equipment not found |

#### 2.2 Reservation Handler Tests

```go
// New file: internal/handler/reservation/reservation_handler_test.go
```

| Handler | Test Cases |
|---------|------------|
| `HandleList` | Admin scope, user scope, filters |
| `HandleGetByID` | Owner access, admin access, not found |
| `HandleCreate` | Single, batch, insufficient credits |
| `HandleUpdate` | Status change, date modification |
| `HandleBulkUpdate` | Admin only, validation |
| `HandleDashboardStats` | Admin only |

#### 2.3 User Handler Tests

```go
// New file: internal/handler/user/user_handler_test.go
```

| Handler | Test Cases |
|---------|------------|
| `HandleGetProfile` | Self, admin viewing other |
| `HandleListUsers` | Admin only, filters |
| `HandleCreateUser` | Success, duplicate email |
| `HandleUpdateUser` | Success, not found |
| `HandleBulkAdjustCredits` | Success, invalid amount |

#### 2.4 Calendar Handler Tests

```go
// New file: internal/handler/calendar/calendar_handler_test.go
```

| Handler | Test Cases |
|---------|------------|
| `HandleGetAvailability` | Default range, custom dates |
| `HandleGetEquipmentStats` | Valid period |
| `HandleGetUserStats` | Valid period |

---

### Phase 3: Integration Tests with Database (Priority: MEDIUM)

**Goal**: Test complete flows with real database

> [!IMPORTANT]
> Integration tests require Supabase connection. Use `//go:build integration` tag.

#### 3.1 Reservation Flow Integration

```go
// File: internal/service/reservation/reservation_e2e_test.go
```

- Create reservation → Verify credit deduction → Return → Verify refund
- Create reservation → Cancel → Verify status & credits
- Bulk approve reservations → Verify all statuses

#### 3.2 Equipment Flow Integration

```go
// File: internal/service/equipment/equipment_e2e_test.go
```

- Create equipment → Update status → Add maintenance log → Archive
- Create equipment → Check availability → Create reservation → Check unavailable

#### 3.3 User/Credit Flow Integration

```go
// File: internal/service/user/user_e2e_test.go
```

- Create user → Adjust credits → Verify history
- Bulk credit adjustment → Verify all balances

---

### Phase 4: Common Utilities & Middleware (Priority: LOW)

#### 4.1 HTTP Utils Tests

```go
// New file: internal/handler/common/http_utils_test.go
```

| Function | Test Cases |
|----------|------------|
| `ExtractBearerToken` | Valid, missing, malformed |
| `RespondJSON` | Various payloads |
| `RespondError` | All error types |
| `ParsePagination` | Defaults, custom values |
| `GetUserFromContext` | Present, missing |

#### 4.2 CORS Middleware Test

```go
// New file: internal/middleware/common/cors_middleware_test.go
```

- OPTIONS preflight handling
- CORS headers verification

---

## Implementation Priority Matrix

| Priority | Component | Estimated Effort | Coverage Impact |
|----------|-----------|------------------|-----------------|
| 🔴 HIGH | Service Layer Gaps | 2-3 days | +25% |
| 🔴 HIGH | Handler Tests | 3-4 days | +30% |
| 🟡 MEDIUM | Integration Tests | 2-3 days | +10% |
| 🟢 LOW | Utilities/Middleware | 1 day | +5% |

---

## Test Execution Commands

### Run All Unit Tests

```bash
cd backend
go test ./... -v -short
```

### Run With Coverage

```bash
cd backend
go test ./... -coverprofile=coverage.out
go tool cover -func=coverage.out
go tool cover -html=coverage.out -o coverage.html
```

### Run Integration Tests Only

```bash
cd backend
go test ./... -v -tags=integration
```

### Run Specific Package Tests

```bash
go test ./internal/service/reservation/... -v
go test ./internal/handler/auth/... -v
```

---

## Mock Strategy

All tests should use the existing mock pattern from [testutils/mocks](file:///e:/bystrze/Magazyn/backend/internal/testutils/mocks):

```go
type MockRepository struct {
    mock.Mock
}

func (m *MockRepository) Method(ctx context.Context, arg Type) (Result, error) {
    args := m.Called(ctx, arg)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(Result), args.Error(1)
}
```

---

## Expected Outcome

| Metric | Current | Target |
|--------|---------|--------|
| Total Coverage | 18.3% | 80%+ |
| Handler Coverage | ~5% | 80%+ |
| Service Coverage | ~50% | 90%+ |
| Integration Tests | 3 files | 8 files |

---

## Notes for Refactoring

> [!CAUTION]
> These tests are specifically designed to validate behavior **before refactoring**. After refactoring:
> 1. All existing tests must pass
> 2. Coverage must not decrease
> 3. New functionality must have corresponding tests
