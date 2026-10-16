/**
 * Creates a mock backend user DTO (snake_case format) for testing transformers and components.
 *
 * @param overrides - Optional property overrides.
 * @returns Mock user DTO object.
 */
export function createMockUserDTO(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-uuid-123",
    email: "test@example.com",
    username: "testuser",
    role: "user",
    credit_balance: 100,
    created_at: "2024-01-15T10:30:00Z",
    updated_at: "2024-06-20T14:45:00Z",
    is_enabled: true,
    ...overrides,
  };
}
