import { api } from './client';
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
    // Convert frontend params to backend format, only include defined values
    const queryParams: Record<string, string | number | boolean> = {};

    if (params) {
      if (params.search) queryParams.search = params.search;
      if (params.type_id) queryParams.type_id = params.type_id;
      if (params.status) queryParams.status = params.status;
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.perPage !== undefined) queryParams.per_page = params.perPage;
      if (params.availableFrom) queryParams.available_from = params.availableFrom;
      if (params.availableTo) queryParams.available_to = params.availableTo;
    }

    const response = await api.get('/api/equipment', Object.keys(queryParams).length > 0 ? queryParams : undefined);

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
