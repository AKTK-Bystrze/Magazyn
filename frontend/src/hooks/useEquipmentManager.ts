import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { equipmentApi } from "@/lib/api/equipment-api";
import type {
  EquipmentManagerFilterState,
  EquipmentSearchItem,
  EquipmentType,
  PaginationMeta,
  CreateEquipmentCommand,
  UpdateEquipmentCommand,
} from "@/types";
import {
  DEFAULT_PAGE,
  DEFAULT_PAGE_SIZE,
  DEFAULT_EQUIPMENT_STATUS_FILTER,
  QUERY_STALE_TIME_MS,
} from "@/lib/config/constants";

/**
 * Default filter state for equipment manager list
 */
const DEFAULT_FILTERS: EquipmentManagerFilterState = {
  page: DEFAULT_PAGE,
  perPage: DEFAULT_PAGE_SIZE,
  status: DEFAULT_EQUIPMENT_STATUS_FILTER as EquipmentManagerFilterState["status"],
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

  // Merge initial filters with defaults
  const [filters, setFilters] = React.useState<EquipmentManagerFilterState>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  // Fetch equipment list
  const {
    data: equipmentData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.list(filters),
    queryFn: () => {
      // Convert filter state to API params
      const params = {
        search: filters.search,
        type_id: filters.typeId,
        status: filters.status === "ALL" ? undefined : filters.status,
        page: filters.page,
        perPage: filters.perPage,
      };
      return equipmentApi.list(params);
    },
    enabled,
    staleTime: QUERY_STALE_TIME_MS,
  });

  // Fetch equipment types
  const { data: typesData, isLoading: isTypesLoading } = useQuery({
    queryKey: QUERY_KEYS.types,
    queryFn: () => equipmentApi.listTypes(),
    staleTime: QUERY_STALE_TIME_MS * 5, // Types change less frequently
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (command: CreateEquipmentCommand) => equipmentApi.create(command),
    onSuccess: () => {
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, command }: { id: string; command: UpdateEquipmentCommand }) =>
      equipmentApi.update(id, command),
    onSuccess: () => {
      // Invalidate list and any cached details
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Archive mutation
  const archiveMutation = useMutation({
    mutationFn: (id: string) => equipmentApi.archive(id),
    onSuccess: () => {
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.all });
    },
  });

  // Update a single filter
  const setFilter = React.useCallback(
    <K extends keyof EquipmentManagerFilterState>(
      key: K,
      value: EquipmentManagerFilterState[K]
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

  // Create equipment handler
  const createEquipment = React.useCallback(
    async (command: CreateEquipmentCommand) => {
      return createMutation.mutateAsync(command);
    },
    [createMutation]
  );

  // Update equipment handler
  const updateEquipment = React.useCallback(
    async (id: string, command: UpdateEquipmentCommand) => {
      return updateMutation.mutateAsync({ id, command });
    },
    [updateMutation]
  );

  // Archive equipment handler
  const archiveEquipment = React.useCallback(
    async (id: string) => {
      return archiveMutation.mutateAsync(id);
    },
    [archiveMutation]
  );

  return {
    equipment: equipmentData?.equipment ?? [],
    pagination: equipmentData?.pagination,
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
    isMutating:
      createMutation.isPending ||
      updateMutation.isPending ||
      archiveMutation.isPending,
  };
}
