import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { equipmentApi } from "@/lib/api/equipment-api";
import type { EquipmentSearchParams } from "@/types";

export function useInfiniteEquipmentList(filters: Partial<EquipmentSearchParams>) {
  return useInfiniteQuery({
    queryKey: ["equipment-infinite", filters],
    queryFn: ({ pageParam = 1 }) => equipmentApi.list({ ...filters, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });
}

/**
 * Custom hook for fetching equipment types with automatic transformation
 *
 * @returns React Query result with transformed equipment types
 */
export function useEquipmentTypes() {
  return useQuery({
    queryKey: ["equipment-types"],
    queryFn: () => equipmentApi.listTypes(),
    staleTime: 1000 * 60 * 5,
  });
}
