import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { equipmentApi } from "@/lib/api/equipment-api";
import { getNextPageParam } from "@/lib/config/query";
import { QUERY_STALE_TIME_MS } from "@/lib/config/constants";
import type { EquipmentSearchParams } from "@/types";

/**
 * Custom hook for infinite pagination of equipment items.
 *
 * @param filters - Search and filtering parameters
 * @returns TanStack React Query infinite query result
 */
export function useInfiniteEquipmentList(filters: Partial<EquipmentSearchParams>) {
  return useInfiniteQuery({
    queryKey: ["equipment-infinite", filters],
    queryFn: ({ pageParam = 1 }) => equipmentApi.list({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam,
  });
}

/**
 * Custom hook for fetching equipment types with automatic transformation.
 *
 * @returns React Query result with transformed equipment types
 */
export function useEquipmentTypes() {
  return useQuery({
    queryKey: ["equipment-types"],
    queryFn: () => equipmentApi.listTypes(),
    staleTime: QUERY_STALE_TIME_MS * 5,
  });
}
