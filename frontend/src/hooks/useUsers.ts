import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "@/lib/api/users-api";
import type {
  UserFilterState,
  UserListResponse,
  UserProfile,
  CreateUserCommand,
  UpdateUserCommand,
  BulkAdjustCreditsCommand,
} from "@/types";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_ROLE_FILTER,
  QUERY_STALE_TIME_MS,
} from "@/lib/config/constants";

/**
 * Default filter state for user list
 */
const DEFAULT_FILTERS: UserFilterState = {
  page: DEFAULT_PAGE,
  perPage: DEFAULT_PAGE_SIZE,
  role: DEFAULT_ROLE_FILTER as UserFilterState["role"],
};

/**
 * Query key factory for users
 * Provides consistent cache key structure
 */
const QUERY_KEYS = {
  all: ["users"] as const,
  list: (filters: Partial<UserFilterState>) =>
    [...QUERY_KEYS.all, "list", filters] as const,
  detail: (id: string) => [...QUERY_KEYS.all, "detail", id] as const,
};

/**
 * Configuration options for useUsers hook
 */
interface UseUsersOptions {
  /** Initial filter values to apply */
  initialFilters?: Partial<UserFilterState>;
  /** Whether the query should run */
  enabled?: boolean;
}

/**
 * Return type for useUsers hook
 */
interface UseUsersReturn {
  /** User list data */
  data: UserListResponse | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Current filter state */
  filters: UserFilterState;
  /** Update a single filter value */
  setFilter: <K extends keyof UserFilterState>(
    key: K,
    value: UserFilterState[K]
  ) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Refetch the list */
  refetch: () => void;
  /** Create a new user */
  createUser: (command: CreateUserCommand) => Promise<UserProfile>;
  /** Update an existing user */
  updateUser: (id: string, command: UpdateUserCommand) => Promise<UserProfile>;
  /** Adjust credits for multiple users */
  bulkAdjustCredits: (command: BulkAdjustCreditsCommand) => Promise<void>;
  /** Mutation loading state */
  isMutating: boolean;
}

/**
 * Hook for managing user list with filtering, pagination, and CRUD operations
 * Handles React Query caching and state synchronization
 *
 * @param options - Configuration options
 * @returns User list data and controls
 *
 * @example
 * ```tsx
 * const { data, isLoading, filters, setFilter, createUser } = useUsers();
 *
 * // Update filter
 * setFilter('role', 'admin');
 *
 * // Create user
 * await createUser({ email: 'test@example.com', username: 'test', role: 'user' });
 * ```
 */
export function useUsers(options: UseUsersOptions = {}): UseUsersReturn {
  const { initialFilters, enabled = true } = options;
  const queryClient = useQueryClient();

  // Merge initial filters with defaults
  const [filters, setFilters] = React.useState<UserFilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Fetch users list
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: () => usersApi.list(filters),
    enabled,
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (command: CreateUserCommand) => usersApi.create(command),
    onSuccess: () => {
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, command }: { id: string; command: UpdateUserCommand }) =>
      usersApi.update(id, command),
    onSuccess: () => {
      // Invalidate list and any cached details
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Bulk adjust credits mutation
  const bulkAdjustCreditsMutation = useMutation({
    mutationFn: (command: BulkAdjustCreditsCommand) =>
      usersApi.bulkAdjustCredits(command),
    onSuccess: () => {
      // Invalidate list and any cached details
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Update a single filter
  const setFilter = React.useCallback(
    <K extends keyof UserFilterState>(key: K, value: UserFilterState[K]) => {
      setFilters((prev) => {
        const newFilters = { ...prev, [key]: value };
        // Reset to page 1 when filters change (except page itself)
        if (key !== "page") {
          newFilters.page = 1;
        }
        return newFilters;
      });
    },
    []
  );

  // Reset all filters
  const resetFilters = React.useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
  }, [initialFilters]);

  // Create user handler
  const createUser = React.useCallback(
    async (command: CreateUserCommand) => {
      return createMutation.mutateAsync(command);
    },
    [createMutation]
  );

  // Update user handler
  const updateUser = React.useCallback(
    async (id: string, command: UpdateUserCommand) => {
      return updateMutation.mutateAsync({ id, command });
    },
    [updateMutation]
  );

  // Bulk adjust credits handler
  const bulkAdjustCredits = React.useCallback(
    async (command: BulkAdjustCreditsCommand) => {
      return bulkAdjustCreditsMutation.mutateAsync(command);
    },
    [bulkAdjustCreditsMutation]
  );

  return {
    data,
    isLoading,
    error: error as Error | null,
    filters,
    setFilter,
    resetFilters,
    refetch,
    createUser,
    updateUser,
    bulkAdjustCredits,
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      bulkAdjustCreditsMutation.isPending,
  };
}
