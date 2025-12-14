import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservationsApi } from "@/lib/api/reservations-api";
import type {
  ReservationFilterState,
  ReservationListResponse,
  UpdateReservationCommand,
  UpdateReservationResponse,
} from "@/types";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_STATUS_FILTER,
  DEFAULT_SORT_OPTION,
  QUERY_STALE_TIME_MS,
} from "@/lib/config/constants";

/**
 * Default filter state for reservation list
 */
const DEFAULT_FILTERS: ReservationFilterState = {
  page: DEFAULT_PAGE,
  perPage: DEFAULT_PAGE_SIZE,
  status: DEFAULT_STATUS_FILTER,
  sort: DEFAULT_SORT_OPTION,
  scope: "my",
};

/**
 * Query key factory for reservations
 */
const QUERY_KEYS = {
  all: ["reservations"] as const,
  list: (filters: Partial<ReservationFilterState>) =>
    [...QUERY_KEYS.all, "list", filters] as const,
  detail: (id: string) => [...QUERY_KEYS.all, "detail", id] as const,
};

/**
 * Configuration options for useReservations hook
 */
interface UseReservationsOptions {
  /** Initial filter values to apply */
  initialFilters?: Partial<ReservationFilterState>;
  /** Whether the query should successfully run */
  enabled?: boolean;
}

interface UseReservationsReturn {
  /** Reservation list data */
  data: ReservationListResponse | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Current filter state */
  filters: ReservationFilterState;
  /** Update a single filter value */
  setFilter: <K extends keyof ReservationFilterState>(
    key: K,
    value: ReservationFilterState[K]
  ) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Refetch the list */
  refetch: () => void;
  /** Cancel a reservation */
  cancelReservation: (id: string) => Promise<UpdateReservationResponse>;
  /** Update a reservation */
  updateReservation: (
    id: string,
    command: UpdateReservationCommand
  ) => Promise<UpdateReservationResponse>;
  /** Mutation loading state */
  isMutating: boolean;
}

/**
 * Hook for managing reservation list with filtering, pagination, and actions
 * Handles React Query caching and state synchronization
 *
 * @param options - Configuration options
 * @returns Reservation list data and controls
 */
export function useReservations(
  options: UseReservationsOptions = {}
): UseReservationsReturn {
  const { initialFilters, enabled = true } = options;
  const queryClient = useQueryClient();

  // Merge initial filters with defaults
  const [filters, setFilters] = React.useState<ReservationFilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Fetch reservations
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: () => reservationsApi.list(filters),
    enabled,
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({
      id,
      command,
    }: {
      id: string;
      command: UpdateReservationCommand;
    }) => reservationsApi.update(id, command),
    onSuccess: () => {
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Cancel mutation (convenience wrapper)
  const cancelMutation = useMutation({
    mutationFn: (id: string) => reservationsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Update a single filter
  const setFilter = React.useCallback(
    <K extends keyof ReservationFilterState>(
      key: K,
      value: ReservationFilterState[K]
    ) => {
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

  // Action handlers
  const cancelReservation = React.useCallback(
    async (id: string) => {
      return cancelMutation.mutateAsync(id);
    },
    [cancelMutation]
  );

  const updateReservation = React.useCallback(
    async (id: string, command: UpdateReservationCommand) => {
      return updateMutation.mutateAsync({ id, command });
    },
    [updateMutation]
  );

  return {
    data,
    isLoading,
    error: error as Error | null,
    filters,
    setFilter,
    resetFilters,
    refetch,
    cancelReservation,
    updateReservation,
    isMutating: updateMutation.isPending || cancelMutation.isPending,
  };
}
