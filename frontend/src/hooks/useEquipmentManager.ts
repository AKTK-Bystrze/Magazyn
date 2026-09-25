import * as React from "react";
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentApi } from "@/lib/api/equipment-api";
import type {
  EquipmentManagerFilterState,
  EquipmentSearchItem,
  EquipmentType,
  PaginationMeta,
  CreateEquipmentCommand,
  UpdateEquipmentCommand,
} from "@/types";
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, QUERY_STALE_TIME_MS } from "@/lib/config/constants";

/**
 * Default filter state for equipment manager list
 */
const DEFAULT_FILTERS: EquipmentManagerFilterState = {
  page: DEFAULT_PAGE,
  perPage: DEFAULT_PAGE_SIZE,
};

/**
 * Query key factory for equipment manager
 * Provides consistent cache key structure
 */
const QUERY_KEYS = {
  all: ["equipment", "admin"] as const,
  list: (filters: Partial<EquipmentManagerFilterState>) =>
    [...QUERY_KEYS.all, "list", filters] as const,
  detail: (id: string) => [...QUERY_KEYS.all, "detail", id] as const,
  types: ["equipment-types"] as const,
};

/**
 * Configuration options for useEquipmentManager hook
 */
interface UseEquipmentManagerOptions {
  /** Initial filter values to apply */
  initialFilters?: Partial<EquipmentManagerFilterState>;
  /** Whether the query should run */
  enabled?: boolean;
}

/**
 * Return type for useEquipmentManager hook
 */
interface UseEquipmentManagerReturn {
  /** Equipment list data */
  equipment: EquipmentSearchItem[];
  /** Pagination metadata */
  pagination: PaginationMeta | undefined;
  /** Equipment types for filters and forms */
  equipmentTypes: EquipmentType[];
  /** Loading state */
  isLoading: boolean;
  /** Types loading state */
  isTypesLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Current filter state */
  filters: EquipmentManagerFilterState;
  /** Update a single filter value */
  setFilter: <K extends keyof EquipmentManagerFilterState>(
    key: K,
    value: EquipmentManagerFilterState[K]
  ) => void;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Refetch the list */
  refetch: () => void;
  /** Create new equipment */
  createEquipment: (command: CreateEquipmentCommand) => Promise<EquipmentSearchItem>;
  /** Update existing equipment */
  updateEquipment: (id: string, command: UpdateEquipmentCommand) => Promise<EquipmentSearchItem>;
  /** Archive equipment (soft delete) */
  archiveEquipment: (id: string) => Promise<void>;
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
 * Hook for managing equipment list with filtering, pagination, and CRUD operations
 * Handles React Query caching and state synchronization
 *
 * @param options - Configuration options
 * @returns Equipment list data and controls
 *
 * @example
 * ```tsx
 * const { equipment, isLoading, filters, setFilter, createEquipment } = useEquipmentManager();
 *
 * // Update filter
 * setFilter('status', 'broken');
 *
 * // Create equipment
 * await createEquipment({ internalId: 'CAM-001', typeId: 'type-uuid' });
 * ```
 */
export function useEquipmentManager(
  options: UseEquipmentManagerOptions = {}
): UseEquipmentManagerReturn {
  const { initialFilters, enabled = true } = options;
  const queryClient = useQueryClient();

  const [filters, setFilters] = React.useState<EquipmentManagerFilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const {
    data: equipmentData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: ({ pageParam = 1 }) => {
      const params = {
        search: filters.search,
        type_id: filters.typeId,
        status: filters.status,
        page: pageParam,
        perPage: filters.perPage,
      };
      return equipmentApi.list(params);
    },
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

  const { data: typesData, isLoading: isTypesLoading } = useQuery({
    queryKey: QUERY_KEYS.types,
    queryFn: () => equipmentApi.listTypes(),
    staleTime: QUERY_STALE_TIME_MS * 5, // Types change less frequently
  });

  const createMutation = useMutation({
    mutationFn: (command: CreateEquipmentCommand) => equipmentApi.create(command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, command }: { id: string; command: UpdateEquipmentCommand }) =>
      equipmentApi.update(id, command),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  const setFilter = React.useCallback(
    <K extends keyof EquipmentManagerFilterState>(
      key: K,
      value: EquipmentManagerFilterState[K]
    ) => {
      setFilters((prev) => {
        const newFilters = { ...prev, [key]: value };
        if (key !== "page") {
          newFilters.page = 1;
        }
        return newFilters;
      });
    },
    []
  );

  const resetFilters = React.useCallback(() => {
    setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
  }, [initialFilters]);

  const createEquipment = React.useCallback(
    async (command: CreateEquipmentCommand) => {
      return createMutation.mutateAsync(command);
    },
    [createMutation]
  );

  const updateEquipment = React.useCallback(
    async (id: string, command: UpdateEquipmentCommand) => {
      return updateMutation.mutateAsync({ id, command });
    },
    [updateMutation]
  );

  const archiveEquipment = React.useCallback(
    async (id: string) => {
      return archiveMutation.mutateAsync(id);
    },
    [archiveMutation]
  );

  const equipment = React.useMemo(() => {
    return equipmentData?.pages.flatMap((page) => page.equipment) ?? [];
  }, [equipmentData]);

  return {
    equipment,
    pagination: equipmentData?.pages[0]?.pagination,
    equipmentTypes: typesData ?? [],
    isLoading,
    isTypesLoading,
    error: error as Error | null,
    filters,
    setFilter,
    resetFilters,
    refetch,
    createEquipment,
    updateEquipment,
    archiveEquipment,
    isMutating: createMutation.isPending || updateMutation.isPending || archiveMutation.isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}
