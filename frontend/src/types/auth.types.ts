import type { Enums } from "../db/database.types";

/**
 * Session information for authenticated user
 * Returned by GET /auth/session
 */
export type SessionInfo = {
  userId: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number;
  isEnabled: boolean;
  expiresAt: string;
};

/**
 * Login request body
 * POST /auth/login
 */
export type LoginRequest = {
  email: string;
};

/**
 * Login response body
 * POST /auth/login
 */
export type LoginResponse = {
  message: string;
};

export type LoginRequestDTO = LoginRequest;
export type LoginResponseDTO = LoginResponse;

/**
 * User profile with credit balance
 * Derived from profiles table, field names in camelCase
 */
export type UserProfile = {
  id: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number;
  createdAt: string;
  updatedAt: string | null;
};

/**
 * User in list view (GET /users)
 * Subset of UserProfile without updated_at
 */
export type UserListItem = {
  id: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number;
  isEnabled: boolean;
  createdAt: string;
};

/**
 * Public user information without sensitive data
 */
export type PublicUser = {
  id: string;
  username: string;
  creditBalance: number;
};

/**
 * Paginated public user list response
 */
export type PublicUserListResponse = {
  users: PublicUser[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
};

/**
 * Command to create user (POST /users)
 * SuperAdmin only
 */
export type CreateUserCommand = {
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance?: number;
};

/**
 * Command to update user (PATCH /users/:id)
 * SuperAdmin only, all fields optional
 */
export type UpdateUserCommand = {
  email?: string;
  role?: Enums<"user_role">;
  creditBalance?: number;
  isEnabled?: boolean;
};

/**
 * Command to adjust credits for multiple users
 * SuperAdmin only
 */
export type BulkAdjustCreditsCommand = {
  userIds: string[];
  amount: number;
  reason: string;
  description?: string;
};

/**
 * Filter state for user list queries
 * Used by useUsers hook for pagination and filtering
 */
export type UserFilterState = {
  page: number;
  perPage: number;
  role: Enums<"user_role"> | "ALL";
  search?: string;
};

/**
 * Paginated user list response
 * Matches GET /users response structure (transformed from backend snake_case)
 */
export type UserListResponse = {
  users: UserListItem[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
};
