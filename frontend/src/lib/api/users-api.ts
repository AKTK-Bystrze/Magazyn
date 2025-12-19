import { api } from "./client";
import type {
  UserFilterState,
  UserListResponse,
  UserProfile,
  CreateUserCommand,
  UpdateUserCommand,
  BulkAdjustCreditsCommand,
} from "@/types";
import {
  transformUserListResponse,
  transformUserProfile,
  transformCreateUserCommand,
  transformUpdateUserCommand,
  transformBulkAdjustCreditsCommand,
} from "@/lib/transformers/user.transformer";

/**
 * API client for user management endpoints
 * Handles data transformation between frontend (camelCase) and backend (snake_case)
 *
 * All endpoints require Admin or SuperAdmin authentication.
 * Create/Update operations require SuperAdmin.
 */
export const usersApi = {
  /**
   * Fetches paginated list of users
   * User must be Admin or SuperAdmin
   *
   * @param filters - Filter and pagination options
   * @returns Paginated user list with transformed data
   */
  list: async (
    filters: Partial<UserFilterState>
  ): Promise<UserListResponse> => {
    const params: Record<string, string | number> = {};

    if (filters.page !== undefined) {
      params.page = filters.page;
    }
    if (filters.perPage !== undefined) {
      params.per_page = filters.perPage;
    }

    // Only add role filter if not 'ALL'
    if (filters.role && filters.role !== "ALL") {
      params.role = filters.role;
    }

    // Add search if provided
    if (filters.search) {
      params.search = filters.search;
    }

    const { data } = await api.get<unknown>("/api/users", params);
    return transformUserListResponse(data);
  },

  /**
   * Fetches a single user by ID
   * User must be Admin or SuperAdmin
   *
   * @param id - User ID
   * @returns User profile with transformed data
   */
  getById: async (id: string): Promise<UserProfile> => {
    const { data } = await api.get<unknown>(`/api/users/${id}`);
    return transformUserProfile(data);
  },

  /**
   * Creates a new user account
   * User must be SuperAdmin
   *
   * @param command - Create user command with email, username, role, creditBalance
   * @returns Created user profile with transformed data
   */
  create: async (command: CreateUserCommand): Promise<UserProfile> => {
    const body = transformCreateUserCommand(command);
    const { data } = await api.post<unknown>("/api/users", body);
    return transformUserProfile(data);
  },

  /**
   * Updates an existing user
   * User must be SuperAdmin
   *
   * @param id - User ID to update
   * @param command - Update command with optional email, role, creditBalance
   * @returns Updated user profile with transformed data
   */
  update: async (
    id: string,
    command: UpdateUserCommand
  ): Promise<UserProfile> => {
    const body = transformUpdateUserCommand(command);
    const { data } = await api.patch<unknown>(`/api/users/${id}`, body);
    return transformUserProfile(data);
  },

  /**
   * Adjusts credit balance for multiple users
   * User must be SuperAdmin
   *
   * @param command - Bulk adjustment command
   */
  bulkAdjustCredits: async (
    command: BulkAdjustCreditsCommand
  ): Promise<void> => {
    const body = transformBulkAdjustCreditsCommand(command);
    await api.post<unknown>("/api/users/bulk-adjust-credits", body);
  },
};
