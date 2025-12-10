import { useQuery } from '@tanstack/react-query';
import { equipmentApi } from '@/lib/api/equipment-api';
import type { EquipmentSearchParams } from '@/types';

/**
 * Custom hook for fetching equipment list with automatic transformation
 * Encapsulates query logic and provides type-safe equipment data
 *
 * @param filters - Equipment search and filter parameters
 * @returns React Query result with transformed equipment data
 */
export function useEquipmentList(filters: Partial<EquipmentSearchParams>) {
  return useQuery({
    queryKey: ['equipment', filters],
    queryFn: () => equipmentApi.list(filters),
    // Keep previous data while fetching to prevent UI flash
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Custom hook for fetching equipment types with automatic transformation
 *
 * @returns React Query result with transformed equipment types
 */
export function useEquipmentTypes() {
  return useQuery({
    queryKey: ['equipment-types'],
    queryFn: () => equipmentApi.listTypes(),
    // Equipment types rarely change, cache for 5 minutes
    staleTime: 1000 * 60 * 5,
  });
}
