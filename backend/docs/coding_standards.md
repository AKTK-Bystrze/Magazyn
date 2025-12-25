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
    *   **`types/`**: shared domain types, DTOs, and error definitions.
    *   **`testutils/`**: Test utilities, fixtures, and shared mocks (`testutils/mocks/`).
    *   **Domain Packages**: Domain-specific constants or types that don't fit in `types` can live in the domain package itself (e.g., `internal/auth/roles.go`).
    *   **`config/`**: Configuration loading and management.
*   **`pkg/`**: Library code that's ok to use by external applications (if any). Currently, most code resides in `internal`.
*   **`docs/`**: Design and user documentation.

### Package Organization
*   **Domain-Driven**: Group code by domain (Auth, Equipment) rather than by layer (all handlers together) where possible, or use a hybrid approach (Layer -> Domain) as we currently do (`handler/auth`, `service/auth`).
*   **Interfaces**: Define interfaces where they are *used* (consumer side) or in a shared `interfaces` package if circular dependencies arise. Currently, we use `repository/interfaces.go` and `service/interfaces.go` for clarity.

## 3. Testing Rules

### 3.1 Test Placement

*   **Unit Tests**: Place in the same package as the code being tested. Use `package foo` or `package foo_test` (for black-box testing).
*   **Integration Tests**: Use build tag `//go:build integration` and suffix `_integration_test.go`. Run with `go test -tags=integration`.

### 3.2 Naming Convention

Follow the pattern: `Test<Method>_<Scenario>_<ExpectedBehavior>`

```go
// Good examples:
func TestCreate_InsufficientCredits_ReturnsConflictError(t *testing.T)
func TestUpdate_UserCancelsOwnReservation_RefundsCredits(t *testing.T)
func TestCalculateDays_SameDay_ReturnsOne(t *testing.T)

// Avoid:
func TestCreate(t *testing.T)           // Too vague
func Test_create_works(t *testing.T)    // Wrong format
```

### 3.3 Table-Driven Tests

Use table-driven tests for comprehensive coverage of similar scenarios:

```go
func TestCalculateDays(t *testing.T) {
    tests := []struct {
        name     string
        start    string
        end      string
        expected int32
    }{
        {"same day", "2025-01-01", "2025-01-01", 1},
        {"two days", "2025-01-01", "2025-01-02", 2},
        {"week long", "2025-01-01", "2025-01-07", 7},
        {"reversed dates", "2025-01-07", "2025-01-01", 0},
    }

    svc := NewReservationService(...)
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := svc.calculateDays(tt.start, tt.end)
            assert.Equal(t, tt.expected, result)
        })
    }
}
```

### 3.4 AAA Format

Structure tests using Arrange-Act-Assert:

```go
t.Run("user cancels pending reservation", func(t *testing.T) {
    // Arrange
    mockRepo := new(mocks.MockReservationRepository)
    svc := reservation.NewReservationService(mockRepo, ...)
    mockRepo.On("GetReservationByID", ctx, "res-1").Return(&reservation, nil)

    // Act
    result, err := svc.Update(ctx, "res-1", cmd, userID, "user")

    // Assert
    assert.NoError(t, err)
    mockRepo.AssertExpectations(t)
})
```

### 3.5 Mock Organization

*   **Centralized Mocks**: Place reusable mocks in `internal/testutils/mocks/`.
*   **Interface Verification**: Always verify mocks implement interfaces:

```go
var _ repository.ReservationRepository = (*MockReservationRepository)(nil)
```

*   **Naming**: Prefix with `Mock`, e.g., `MockReservationRepository`, `MockEmailService`.
*   **Package-Specific Mocks**: If a mock is only used in one test file, define it inline in that file.

### 3.6 Test Utilities Package (`internal/testutils`)

The `testutils` package provides shared utilities for integration testing:

*   **`config.go`**: Environment setup and Supabase client initialization
    *  `SetupIntegrationTest()` — Loads `.env` and initializes `TestClient`
    *  `CreateTestUser(email, password)` — Creates an auth user (requires service role key)
    *  `DeleteTestUser(userID)` — Cleans up auth users

*   **`mocks/`**: Centralized mock implementations for all repository interfaces

**Usage in `TestMain`:**
```go
func TestMain(m *testing.M) {
    if _, err := testutils.SetupIntegrationTest(); err != nil {
        fmt.Printf("Skipping integration tests: %v\n", err)
        return
    }
    m.Run()
}
```

### 3.7 Integration Test Fixtures

For integration tests requiring real database connections, use the fixture pattern.
Split fixture into a dedicated `*_fixture_test.go` file for reusability.

**Fixture Structure:**
```go
// reservation_integration_fixture_test.go
type testFixture struct {
    t           *testing.T
    svc         Service
    client      *supabase.Client
    testUserID  string
    equipmentID string
    cleanup     []func()
}

func setupTestFixture(t *testing.T) *testFixture {
    svc, _, client := setupIntegrationTest(t)
    fixture := &testFixture{t: t, svc: svc, client: client, cleanup: []func(){}}
    // Initialize test data...
    return fixture
}

func (f *testFixture) teardown() {
    // Execute cleanup in LIFO order (newest first)
    for i := len(f.cleanup) - 1; i >= 0; i-- {
        f.cleanup[i]()
    }
}
```

**Usage Pattern:**
```go
func TestCreate_ValidInput_Succeeds(t *testing.T) {
    fixture := setupTestFixture(t)
    defer fixture.teardown()

    // Use fixture helpers
    reservationID, err := fixture.createTestReservation(fixture.testUserID, 5, 7)
    require.NoError(t, err)
    // ...assertions
}
```

**Fixture Helper Methods:**
*   Encapsulate common operations (e.g., `createTestReservation`, `getUserBalance`)
*   Automatically register cleanup callbacks
*   Provide date utilities (`dateOffset(days)`, `todayStr()`)

### 3.8 Anti-Patterns to Avoid

| ❌ Don't | ✅ Do Instead |
|----------|---------------|
| Duplicate setup code in each test | Use shared fixtures with `setupTestFixture()` |
| Manual cleanup at test end | Use `defer fixture.teardown()` with LIFO cleanup |
| Hardcode test user/equipment IDs | Generate unique IDs with timestamps |
| Use `time.Sleep()` for async waits | Use polling with timeout or event-based waits |
| Define types inline (e.g., `type profile struct{}`) | Reuse types from fixture or `types` package |
| Create repository instances per subtest | Create once in fixture, share across subtests |

### 3.9 File Organization for Integration Tests

For complex domains, split integration tests across multiple files:

```
service/reservation/
├── reservation_service.go
├── reservation_service_test.go          # Unit tests
├── reservation_integration_fixture_test.go  # Shared fixture & helpers
├── reservation_integration_create_test.go   # Creation scenarios
├── reservation_integration_update_test.go   # Modification scenarios
└── reservation_integration_test.go          # Basic/atomic tests
```

## 4. Code Style & Best Practices

*   **Formatting**: Always run `go fmt` before committing.
*   **Linting**: Use `golangci-lint` to catch common errors.
*   **Error Handling**:
    *   Return errors rather than panicking.
    *   Use custom error types (defined in `internal/types/errors.go`) for domain-specific errors (NotFound, Conflict, etc.).
    *   Wrap errors with context when propagating them up the stack (e.g., `fmt.Errorf("failed to create user: %w", err)`).
*   **Logging**: Use the internal `logger` package (`slog` wrapper). Do not use `fmt.Println` in production code.
*   **Configuration**: Do not hardcode secrets or configuration. Use the `config` package to read from environment variables or `.env` files.
