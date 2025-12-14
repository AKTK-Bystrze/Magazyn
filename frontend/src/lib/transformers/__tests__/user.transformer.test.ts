import { describe, it, expect } from 'vitest';
import {
  transformCreateUserCommand,
  transformUpdateUserCommand,
  transformUserListItem,
  transformUserProfile,
  transformUserListResponse,
} from '../user.transformer';
import type { CreateUserCommand, UpdateUserCommand } from '@/types';

// =============================================================================
// Test Data Factories
// =============================================================================

/**
 * Creates a mock backend user DTO (snake_case format)
 */
const createMockUserDTO = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-uuid-123',
  email: 'test@example.com',
  username: 'testuser',
  role: 'user',
  credit_balance: 100,
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-06-20T14:45:00Z',
  is_enabled: true,
  ...overrides,
});

/**
 * Creates a mock backend user list response DTO
 */
const createMockUserListResponseDTO = (
  users: ReturnType<typeof createMockUserDTO>[] = [createMockUserDTO()],
  pagination: Record<string, number> = {}
) => ({
  users,
  pagination: {
    page: 1,
    per_page: 25,
    total_items: users.length,
    total_pages: 1,
    ...pagination,
  },
});

// =============================================================================
// transformCreateUserCommand Tests
// =============================================================================

describe('transformCreateUserCommand', () => {
  it('should transform all fields from camelCase to snake_case', () => {
    const command: CreateUserCommand = {
      email: 'newuser@example.com',
      username: 'newuser',
      role: 'admin',
      creditBalance: 50,
    };

    const result = transformCreateUserCommand(command);

    expect(result).toEqual({
      email: 'newuser@example.com',
      username: 'newuser',
      role: 'admin',
      credit_balance: 50,
    });
  });

  it('should default creditBalance to 0 when undefined', () => {
    const command: CreateUserCommand = {
      email: 'newuser@example.com',
      username: 'newuser',
      role: 'user',
    };

    const result = transformCreateUserCommand(command);

    expect(result.credit_balance).toBe(0);
  });

  it('should handle super_admin role', () => {
    const command: CreateUserCommand = {
      email: 'admin@example.com',
      username: 'superadmin',
      role: 'super_admin',
      creditBalance: 1000,
    };

    const result = transformCreateUserCommand(command);

    expect(result.role).toBe('super_admin');
  });
});

// =============================================================================
// transformUpdateUserCommand Tests
// =============================================================================

describe('transformUpdateUserCommand', () => {
  it('should only include defined fields', () => {
    const command: UpdateUserCommand = {
      email: 'updated@example.com',
    };

    const result = transformUpdateUserCommand(command);

    expect(result).toEqual({ email: 'updated@example.com' });
    expect(result).not.toHaveProperty('role');
    expect(result).not.toHaveProperty('credit_balance');
  });

  it('should transform creditBalance to credit_balance', () => {
    const command: UpdateUserCommand = {
      creditBalance: 200,
    };

    const result = transformUpdateUserCommand(command);

    expect(result).toEqual({ credit_balance: 200 });
  });

  it('should include all fields when all are defined', () => {
    const command: UpdateUserCommand = {
      email: 'updated@example.com',
      role: 'admin',
      creditBalance: 150,
    };

    const result = transformUpdateUserCommand(command);

    expect(result).toEqual({
      email: 'updated@example.com',
      role: 'admin',
      credit_balance: 150,
    });
  });

  it('should return empty object when no fields are defined', () => {
    const command: UpdateUserCommand = {};

    const result = transformUpdateUserCommand(command);

    expect(result).toEqual({});
  });

  it('should handle zero creditBalance correctly', () => {
    const command: UpdateUserCommand = {
      creditBalance: 0,
    };

    const result = transformUpdateUserCommand(command);

    expect(result).toEqual({ credit_balance: 0 });
  });
});

// =============================================================================
// transformUserListItem Tests
// =============================================================================

describe('transformUserListItem', () => {
  it('should transform snake_case DTO to camelCase frontend type', () => {
    const dto = createMockUserDTO();

    const result = transformUserListItem(dto);

    expect(result).toEqual({
      id: 'user-uuid-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      creditBalance: 100,
      createdAt: '2024-01-15T10:30:00Z',
    });
  });

  it('should handle all user roles', () => {
    const adminDto = createMockUserDTO({ role: 'admin' });
    const superAdminDto = createMockUserDTO({ role: 'super_admin' });

    expect(transformUserListItem(adminDto).role).toBe('admin');
    expect(transformUserListItem(superAdminDto).role).toBe('super_admin');
  });

  it('should handle zero credit balance', () => {
    const dto = createMockUserDTO({ credit_balance: 0 });

    const result = transformUserListItem(dto);

    expect(result.creditBalance).toBe(0);
  });
});

// =============================================================================
// transformUserProfile Tests
// =============================================================================

describe('transformUserProfile', () => {
  it('should transform DTO to UserProfile including updatedAt', () => {
    const dto = createMockUserDTO();

    const result = transformUserProfile(dto);

    expect(result).toEqual({
      id: 'user-uuid-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      creditBalance: 100,
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-06-20T14:45:00Z',
    });
  });

  it('should handle null updatedAt', () => {
    const dto = createMockUserDTO({ updated_at: null });

    const result = transformUserProfile(dto);

    expect(result.updatedAt).toBeNull();
  });
});

// =============================================================================
// transformUserListResponse Tests
// =============================================================================

describe('transformUserListResponse', () => {
  it('should transform paginated response with users', () => {
    const users = [
      createMockUserDTO({ id: 'user-1', username: 'user1' }),
      createMockUserDTO({ id: 'user-2', username: 'user2', role: 'admin' }),
    ];
    const dto = createMockUserListResponseDTO(users, {
      page: 2,
      per_page: 10,
      total_items: 25,
      total_pages: 3,
    });

    const result = transformUserListResponse(dto);

    expect(result.users).toHaveLength(2);
    expect(result.users[0].username).toBe('user1');
    expect(result.users[1].role).toBe('admin');
    expect(result.pagination).toEqual({
      page: 2,
      perPage: 10,
      totalItems: 25,
      totalPages: 3,
    });
  });

  it('should handle empty users array', () => {
    const dto = createMockUserListResponseDTO([], {
      total_items: 0,
      total_pages: 0,
    });

    const result = transformUserListResponse(dto);

    expect(result.users).toEqual([]);
    expect(result.pagination.totalItems).toBe(0);
  });

  it('should use defaults when pagination fields are missing', () => {
    const dto = { users: [], pagination: {} };

    const result = transformUserListResponse(dto);

    expect(result.pagination.page).toBe(1);
    expect(result.pagination.perPage).toBe(25);
    expect(result.pagination.totalItems).toBe(0);
    expect(result.pagination.totalPages).toBe(0);
  });

  it('should handle null users array gracefully', () => {
    const dto = { users: null, pagination: { page: 1, per_page: 25, total_items: 0, total_pages: 0 } };

    const result = transformUserListResponse(dto);

    expect(result.users).toEqual([]);
  });
});
