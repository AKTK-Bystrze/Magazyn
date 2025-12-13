import type {
  UserProfile,
  UserListItem,
  UserListResponse,
  CreateUserCommand,
  UpdateUserCommand,
} from "@/types";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/constants";

// =============================================================================
// BACKEND DTO TYPES (snake_case)
// =============================================================================

/**
 * Backend user DTO structure (snake_case)
 * Source: backend/internal/types/user_types.go
 */
interface UserDTO {
  id: string;
  email: string;
  username: string;
  role: string;
  credit_balance: number;
  is_enabled: boolean;
  created_at: string;
  updated_at: string | null;
}

/**
 * Backend paginated user list response structure
 */
interface UserListResponseDTO {
  users: UserDTO[];
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

// =============================================================================
// REQUEST TRANSFORMERS (Frontend → Backend: camelCase → snake_case)
// =============================================================================

/**
 * Transforms CreateUserCommand to backend format
 * Converts camelCase to snake_case for API submission
 *
 * @param command - Frontend create user command with camelCase fields
 * @returns Backend-compatible object with snake_case fields
 */
export function transformCreateUserCommand(
  command: CreateUserCommand
): Record<string, unknown> {
  return {
    email: command.email,
    username: command.username,
    role: command.role,
    credit_balance: command.creditBalance ?? 0,
  };
}

/**
 * Transforms UpdateUserCommand to backend format
 * Only includes fields that are defined (partial update)
 *
 * @param command - Frontend update command with optional camelCase fields
 * @returns Backend-compatible object with snake_case fields
 */
export function transformUpdateUserCommand(
  command: UpdateUserCommand
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (command.email !== undefined) {
    result.email = command.email;
  }
  if (command.role !== undefined) {
    result.role = command.role;
  }
  if (command.creditBalance !== undefined) {
    result.credit_balance = command.creditBalance;
  }
  if (command.isEnabled !== undefined) {
    result.is_enabled = command.isEnabled;
  }

  return result;
}

// =============================================================================
// RESPONSE TRANSFORMERS (Backend → Frontend: snake_case → camelCase)
// =============================================================================

/**
 * Transforms a single user from backend to frontend format
 *
 * @param dto - Backend user object with snake_case fields
 * @returns Frontend UserListItem with camelCase fields
 */
export function transformUserListItem(dto: UserDTO): UserListItem {
  return {
    id: dto.id,
    email: dto.email,
    username: dto.username,
    role: dto.role as UserListItem["role"],
    creditBalance: dto.credit_balance,
    isEnabled: dto.is_enabled,
    createdAt: dto.created_at,
  };
}

/**
 * Transforms a single user to UserProfile format (includes updatedAt)
 *
 * @param data - Backend user response (unknown for safety)
 * @returns Frontend UserProfile with camelCase fields
 */
export function transformUserProfile(data: unknown): UserProfile {
  const dto = data as UserDTO;

  return {
    id: dto.id,
    email: dto.email,
    username: dto.username,
    role: dto.role as UserProfile["role"],
    creditBalance: dto.credit_balance,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

/**
 * Transforms paginated user list response from backend to frontend format
 *
 * @param data - Backend response (unknown for safety)
 * @returns Transformed UserListResponse with camelCase fields and pagination
 */
export function transformUserListResponse(data: unknown): UserListResponse {
  const dto = data as UserListResponseDTO;

  return {
    users: (dto.users || []).map(transformUserListItem),
    pagination: {
      page: dto.pagination?.page ?? 1,
      perPage: dto.pagination?.per_page ?? DEFAULT_PAGE_SIZE,
      totalItems: dto.pagination?.total_items ?? 0,
      totalPages: dto.pagination?.total_pages ?? 0,
    },
  };
}
