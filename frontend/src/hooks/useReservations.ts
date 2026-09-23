import * as React from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reservationsApi } from "@/lib/api/reservations-api";
import type {
  ReservationFilterState,
  ReservationListResponse,
  UpdateReservationCommand,
  UpdateReservationResponse,
  BulkUpdateReservationsCommand,
  BulkStatusUpdateResponse,
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
  list: (filters: Partial<ReservationFilterState>) => [...QUERY_KEYS.all, "list", filters] as const,
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
  /** Bulk update reservation status */
  bulkUpdateStatus: (command: BulkUpdateReservationsCommand) => Promise<BulkStatusUpdateResponse>;
  /** Mutation loading state */
  isMutating: boolean;
  /** Fetch next page of items */
  fetchNextPage: () => void;
  /** True if there is a next page */
  hasNextPage: boolean;
  /** True if currently fetching next page */
  isFetchingNextPage: boolean;
}

/**
 * Hook for managing reservation list with filtering, pagination, and actions
 * Handles React Query caching and state synchronization
 *
 * @param options - Configuration options
 * @returns Reservation list data and controls
 */
export function useReservations(options: UseReservationsOptions = {}): UseReservationsReturn {
  const { initialFilters, enabled = true } = options;
  const queryClient = useQueryClient();

  // Merge initial filters with defaults
  const [filters, setFilters] = React.useState<ReservationFilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Fetch reservations
  const {
    data: infiniteData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: ({ pageParam = 1 }) => reservationsApi.list({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    enabled,
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, command }: { id: string; command: UpdateReservationCommand }) =>
      reservationsApi.update(id, command),
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

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (command: BulkUpdateReservationsCommand) => reservationsApi.bulkUpdate(command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Update a single filter
  const setFilter = React.useCallback(
    <K extends keyof ReservationFilterState>(key: K, value: ReservationFilterState[K]) => {
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

  const bulkUpdateStatus = React.useCallback(
    async (command: BulkUpdateReservationsCommand) => {
      return bulkUpdateMutation.mutateAsync(command);
    },
    [bulkUpdateMutation]
  );

  const data = React.useMemo(() => {
    if (!infiniteData) return undefined;
    return {
      reservations: infiniteData.pages.flatMap((page) => page.reservations),
      pagination: infiniteData.pages[0].pagination,
    };
  }, [infiniteData]);

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
    bulkUpdateStatus,
    isMutating:
      updateMutation.isPending || cancelMutation.isPending || bulkUpdateMutation.isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
