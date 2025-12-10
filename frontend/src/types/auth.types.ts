// =============================================================================
// AUTH & USER TYPES
// =============================================================================

// Re-export database types for reference
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
  expiresAt: string; // ISO 8601
};

/**
 * Login request body
 * POST /auth/login
 */
export type LoginRequest = {
  email: string;
};

/**
 * User profile with credit balance
 * Derived from profiles table, field names in camelCase
 */
export type UserProfile = {
  id: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number; // from profiles.credit_balance
  createdAt: string; // from profiles.created_at (ISO 8601)
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
  createdAt: string;
};

/**
 * Command to create user (POST /users)
 * SuperAdmin only
 */
export type CreateUserCommand = {
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance?: number; // optional, defaults to 0
};

/**
 * Command to update user (PATCH /users/:id)
 * SuperAdmin only, all fields optional
 */
export type UpdateUserCommand = {
  email?: string;
  role?: Enums<"user_role">;
  creditBalance?: number;
};
