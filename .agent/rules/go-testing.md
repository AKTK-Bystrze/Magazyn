---
description: 
globs: *_test.go
alwaysApply: false
---

## TESTING

### Guidelines for UNIT

#### GO TESTING

- Use descriptive subtests with `t.Run()` for organization - Group related test scenarios under a parent test function using `t.Run("descriptive scenario name", func(t *testing.T) {...})`. This provides better test output, clearer failures, and allows running specific scenarios individually. Name subtests with clear behavior descriptions like "returns 401 when Authorization header missing" or "allows admin through".
- Create setup helper functions to reduce duplication - Extract common test initialization logic into helper functions like `setupMocks()` that return configured mock objects. This keeps tests focused on the specific scenario being tested and reduces code duplication across test cases.
- Track next handler execution explicitly in middleware tests - Use boolean flags (`nextCalled := false`) to verify whether middleware correctly calls or blocks the next handler. This makes test intent clear and catches subtle middleware logic errors. Assert expected behavior with `assert.True(t, nextCalled)` or `assert.False(t, nextCalled)`.
- Always call `mock.AssertExpectations(t)` after testing with mocks - This verifies that all expected mock method calls were made exactly as configured. Place this assertion at the end of each test to catch missing or unexpected interactions with dependencies.
- Use `mock.AssertNotCalled(t, "MethodName", args...)` for negative assertions - When testing error paths or guard conditions, explicitly verify that certain methods should NOT be called. This documents expected behavior and catches logic errors where methods are called inappropriately.
- Write comprehensive edge case tests in dedicated test functions - Group edge cases in separate test functions like `TestFunctionName_EdgeCases` to keep main tests focused on primary scenarios. Test boundary conditions, empty inputs, nil values, type mismatches, and other unusual but valid inputs.
- Test nil-safety in mock return values - When mocking methods that return pointers, check if the returned value is nil before type asserting: `if args.Get(0) == nil { return nil, args.Error(1) }`. This prevents nil pointer panics in tests and mirrors production error handling.
- Use testify/mock for flexible mock setup - Leverage `mock.Mock` from `github.com/stretchr/testify/mock` for creating test doubles. Embed it in custom mock structs and use `m.Called(args...)` to track calls. Use `args.Get(index)` for return values and `args.Error(index)` for errors.
- Structure tests following the Arrange-Act-Assert pattern - Clearly separate test setup (arrange), execution (act), and verification (assert) phases. Use blank lines or comments to visually separate these sections for improved readability.
- Test HTTP middleware with `httptest` - Use `httptest.NewRequest()` to create test requests and `httptest.NewRecorder()` to capture responses. Verify status codes, response bodies, and headers. Test both success paths and error conditions comprehensively.
- Verify context propagation in middleware - When testing middleware that adds values to `context.Context`, extract and assert the context values in the next handler: `ctxUser := r.Context().Value(appcontext.UserContextKey).(*types.User)`. This ensures middleware correctly passes data through the request chain.
- Test error type assertions with `assert.IsType()` - When testing that specific error types are returned, use `assert.IsType(t, &types.ConflictError{}, err)` instead of just checking `err != nil`. This ensures the correct error semantics are maintained.
- Use `mock.AnythingOfType("TypeName")` for flexible argument matching - When the exact value of an argument isn't critical to the test, use `mock.AnythingOfType("types.PublicEquipmentInsert")` to match any value of that type. This reduces test brittleness while still validating method calls.
- Create helper functions for common test utilities - Define package-level helper functions like `stringPtr(s string) *string` for creating pointers to literals. These reduce verbosity and improve test readability when working with APIs that use pointer fields.
- Test context.Background() usage explicitly - When services accept `context.Context`, use `ctx := context.Background()` in unit tests and pass it to all method calls. This makes context usage visible and prepares code for context-aware features like timeouts and cancellation.
- Separate unit tests from integration tests using build tags - Add `//go:build integration` at the top of integration test files to exclude them from regular unit test runs. This enables fast unit test execution during development while maintaining comprehensive integration tests for CI/CD.
- Test HTTP handlers with realistic request/response cycles - Create complete request/response scenarios using `httptest`, including headers, query parameters, and request bodies. Verify not just status codes but also response content and structure.
- Monitor test coverage with purpose and only when asked - Run `go test -cover` to measure coverage, but focus on meaningful tests over arbitrary percentages. Critical business logic and error paths should have thorough coverage, but don't write tests solely to increase metrics.

