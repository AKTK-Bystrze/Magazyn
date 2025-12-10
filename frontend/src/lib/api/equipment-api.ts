import { api } from '@/lib/api';
import {
  transformEquipmentListResponse,
  transformEquipmentTypesResponse,
} from '@/lib/transformers/equipment.transformer';
import type { EquipmentSearchItem, EquipmentType, PaginationMeta, EquipmentSearchParams } from '@/types';

/**
 * Equipment API module with automatic DTO transformation
 * All methods return frontend-friendly types (camelCase, nested structures)
 */
export const equipmentApi = {
  /**
   * Fetch paginated equipment list with filters
   * Automatically transforms backend snake_case DTOs to frontend camelCase types
   *
   * @param params - Search and filter parameters
   * @returns Promise with equipment array and pagination metadata
   */
  async list(params?: Partial<EquipmentSearchParams>): Promise<{
    equipment: EquipmentSearchItem[];
    pagination: PaginationMeta;
  }> {
    // Convert frontend params to backend format if needed
    const queryParams = params
      ? {
          search: params.search,
          type_id: params.type_id,
          status: params.status,
          page: params.page,
          per_page: params.perPage,
        }
      : undefined;

    const response = await api.get('/api/equipment', queryParams);

    // Transform backend response to frontend format
    return transformEquipmentListResponse(response.data);
  },

  /**
   * Fetch all equipment types
   * Automatically transforms backend snake_case DTOs to frontend camelCase types
   *
   * @returns Promise with array of equipment types
   */
  async listTypes(): Promise<EquipmentType[]> {
    const response = await api.get('/api/equipment-types');

    // Transform backend response to frontend format
    return transformEquipmentTypesResponse(response.data);
  },
};
