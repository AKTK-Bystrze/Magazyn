import { api } from './client';
import {
  transformEquipmentListResponse,
  transformEquipmentTypesResponse,
} from '@/lib/transformers/equipment.transformer';
import type {
  EquipmentSearchItem,
  EquipmentType,
  PaginationMeta,
  EquipmentSearchParams,
  CreateEquipmentCommand,
  UpdateEquipmentCommand,
  MaintenanceLog,
  CreateMaintenanceLogCommand,
} from '@/types';

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

    // DEBUG: Log API request parameters
    console.log('[DEBUG] equipmentApi.list - Input params:', params);
    console.log('[DEBUG] equipmentApi.list - Query params sent to API:', queryParams);

    const response = await api.get('/api/equipment', Object.keys(queryParams).length > 0 ? queryParams : undefined);

    // DEBUG: Log response
    console.log('[DEBUG] equipmentApi.list - Response equipment count:', (response.data as { equipment?: unknown[] })?.equipment?.length);

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

  /**
   * Create new equipment
   *
   * @param command - Equipment creation data
   * @returns Promise with created equipment
   */
  async create(command: CreateEquipmentCommand): Promise<EquipmentSearchItem> {
    // Convert frontend camelCase to backend snake_case
    const payload = {
      internal_id: command.internalId,
      type_id: command.typeId,
      name: command.name,
      description: command.description,
      status: command.status,
      image_path: command.imagePath,
    };

    const response = await api.post('/api/equipment', payload);

    // Transform single equipment response
    const { equipment } = transformEquipmentListResponse({
      equipment: [response.data],
      pagination: { page: 1, per_page: 1, total: 1, total_pages: 1 }
    });
    return equipment[0];
  },

  /**
   * Update existing equipment
   *
   * @param id - Equipment ID
   * @param command - Equipment update data
   * @returns Promise with updated equipment
   */
  async update(id: string, command: UpdateEquipmentCommand): Promise<EquipmentSearchItem> {
    // Convert frontend camelCase to backend snake_case
    const payload: Record<string, unknown> = {};
    if (command.name !== undefined) payload.name = command.name;
    if (command.description !== undefined) payload.description = command.description;
    if (command.status !== undefined) payload.status = command.status;
    if (command.imagePath !== undefined) payload.image_path = command.imagePath;

    const response = await api.patch(`/api/equipment/${id}`, payload);

    // Transform single equipment response
    const { equipment } = transformEquipmentListResponse({
      equipment: [response.data],
      pagination: { page: 1, per_page: 1, total: 1, total_pages: 1 }
    });
    return equipment[0];
  },

  /**
   * Archive (soft delete) equipment
   *
   * @param id - Equipment ID to archive
   */
  async archive(id: string): Promise<void> {
    await api.delete(`/api/equipment/${id}`);
  },

  /**
   * Get equipment details
   * 
   * @param id - Equipment ID
   * @returns Promise with equipment details
   */
  async getDetails(id: string): Promise<EquipmentSearchItem> {
    const response = await api.get(`/api/equipment/${id}`);

    // Transform single equipment response
    const { equipment } = transformEquipmentListResponse({
      equipment: [response.data],
      pagination: { page: 1, per_page: 1, total: 1, total_pages: 1 }
    });
    return equipment[0];
  },

  /**
   * Get maintenance logs for equipment
   * 
   * @param equipmentId - Equipment ID
   * @returns Promise with array of maintenance logs
   */
  async getMaintenanceLogs(equipmentId: string): Promise<MaintenanceLog[]> {
    const response = await api.get(`/api/equipment/${equipmentId}/maintenance-logs`);

    // Transform backend response to frontend format
    const data = response.data as { maintenance_logs?: MaintenanceLogDTO[] };
    return (data.maintenance_logs ?? []).map(transformMaintenanceLog);
  },

  /**
   * Add maintenance log entry for equipment
   * 
   * @param equipmentId - Equipment ID
   * @param command - Maintenance log creation data
   * @returns Promise with created maintenance log
   */
  async addMaintenanceLog(
    equipmentId: string,
    command: CreateMaintenanceLogCommand
  ): Promise<MaintenanceLog> {
    const response = await api.post(`/api/equipment/${equipmentId}/maintenance-logs`, {
      notes: command.notes,
    });

    return transformMaintenanceLog(response.data as MaintenanceLogDTO);
  },

  /**
   * Get reservation history for equipment
   * 
   * @param equipmentId - Equipment ID
   * @returns Promise with array of reservation history items
   */
  async getReservationHistory(equipmentId: string): Promise<EquipmentReservationHistoryItem[]> {
    const response = await api.get(`/api/equipment/${equipmentId}/reservations`);

    // Transform backend response to frontend format
    const data = response.data as { reservations?: ReservationHistoryDTO[] };
    return (data.reservations ?? []).map(transformReservationHistory);
  },
};

// =============================================================================
// Maintenance Log DTO and Transformer
// =============================================================================

interface MaintenanceLogDTO {
  id: string;
  equipment_id: string;
  previous_status: string | null;
  new_status: string;
  notes: string | null;
  admin_id: string | null;
  admin_username: string | null;
  created_at: string;
}

function transformMaintenanceLog(dto: MaintenanceLogDTO): MaintenanceLog {
  return {
    id: dto.id,
    equipmentId: dto.equipment_id,
    previousStatus: dto.previous_status as MaintenanceLog["previousStatus"],
    newStatus: dto.new_status as MaintenanceLog["newStatus"],
    notes: dto.notes,
    adminId: dto.admin_id,
    adminUsername: dto.admin_username,
    createdAt: dto.created_at,
  };
}

// =============================================================================
// Reservation History DTO and Transformer
// =============================================================================

interface ReservationHistoryDTO {
  id: string;
  user_id: string;
  username: string;
  start_date: string;
  end_date: string;
  status: string;
  credits: number;
  created_at: string;
}

import type { EquipmentReservationHistoryItem } from '@/types';

function transformReservationHistory(dto: ReservationHistoryDTO): EquipmentReservationHistoryItem {
  return {
    id: dto.id,
    userId: dto.user_id,
    username: dto.username,
    startDate: dto.start_date,
    endDate: dto.end_date,
    status: dto.status as EquipmentReservationHistoryItem["status"],
    creditCost: dto.credits,
    createdAt: dto.created_at,
  };
}
