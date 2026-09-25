import { api } from "./client";
import {
  transformEquipmentDTO,
  transformEquipmentListResponse,
  transformEquipmentTypesResponse,
} from "@/lib/transformers/equipment.transformer";
import type {
  EquipmentSearchItem,
  EquipmentType,
  PaginationMeta,
  EquipmentSearchParams,
  CreateEquipmentCommand,
  UpdateEquipmentCommand,
  MaintenanceLog,
  CreateMaintenanceLogCommand,
} from "@/types";

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
    const queryParams: Record<string, string | number | boolean> = {};

    if (params) {
      if (params.search) queryParams.search = params.search;
      if (params.typeId) queryParams.type_id = params.typeId;
      if (params.status) queryParams.status = params.status;
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.perPage !== undefined) queryParams.per_page = params.perPage;
      if (params.availableFrom) queryParams.available_from = params.availableFrom;
      if (params.availableTo) queryParams.available_to = params.availableTo;
    }

    const response = await api.get(
      "/api/equipment",
      Object.keys(queryParams).length > 0 ? queryParams : undefined
    );

    return transformEquipmentListResponse(response.data);
  },

  /**
   * Fetch all equipment types
   * Automatically transforms backend snake_case DTOs to frontend camelCase types
   *
   * @returns Promise with array of equipment types
   */
  async listTypes(): Promise<EquipmentType[]> {
    const response = await api.get("/api/equipment-types");

    return transformEquipmentTypesResponse(response.data);
  },

  /**
   * Create new equipment
   *
   * @param command - Equipment creation data
   * @returns Promise with created equipment
   */
  async create(command: CreateEquipmentCommand): Promise<EquipmentSearchItem> {
    const payload = {
      internal_id: command.internalId,
      type_id: command.typeId,
      name: command.name,
      description: command.description,
      status: command.status,
      image_path: command.imagePath,
    };

    const response = await api.post("/api/equipment", payload);

    return transformEquipmentDTO(response.data);
  },

  /**
   * Update existing equipment
   *
   * @param id - Equipment ID
   * @param command - Equipment update data
   * @returns Promise with updated equipment
   */
  async update(id: string, command: UpdateEquipmentCommand): Promise<EquipmentSearchItem> {
    const payload: Record<string, unknown> = {};
    if (command.name !== undefined) payload.name = command.name;
    if (command.description !== undefined) payload.description = command.description;
    if (command.status !== undefined) payload.status = command.status;
    if (command.imagePath !== undefined) payload.image_path = command.imagePath;

    const response = await api.patch(`/api/equipment/${id}`, payload);

    return transformEquipmentDTO(response.data);
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
   * Get equipment details with maintenance logs
   * Returns both equipment data and maintenance logs from a single API call
   * per the equipment-details-reuse-guide.md
   *
   * @param id - Equipment ID
   * @returns Promise with equipment details and maintenance logs
   */
  async getDetailsWithLogs(id: string): Promise<{
    equipment: EquipmentSearchItem;
    maintenanceLogs: MaintenanceLog[];
  }> {
    const response = await api.get(`/api/equipment/${id}`);

    const equipment = transformEquipmentDTO(response.data);

    const data = response.data as { maintenance_logs?: MaintenanceLogDTO[] };
    const maintenanceLogs = (data.maintenance_logs ?? []).map(transformMaintenanceLog);

    return { equipment, maintenanceLogs };
  },

  /**
   * Get equipment details only (without maintenance logs)
   *
   * @param id - Equipment ID
   * @returns Promise with equipment details
   */
  async getDetails(id: string): Promise<EquipmentSearchItem> {
    const { equipment } = await this.getDetailsWithLogs(id);
    return equipment;
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
   * Uses GET /reservations?equipment_id={id}&scope=all instead of separate endpoint
   * per the equipment-details-reuse-guide.md
   *
   * @param equipmentId - Equipment ID
   * @returns Promise with array of reservation history items
   */
  async getReservationHistory(equipmentId: string): Promise<EquipmentReservationHistoryItem[]> {
    const response = await api.get("/api/reservations", {
      equipment_id: equipmentId,
      scope: "all",
      per_page: 50,
    });

    const data = response.data as { reservations?: ReservationHistoryDTO[] };
    return (data.reservations ?? []).map(transformReservationHistory);
  },
};

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

interface ReservationHistoryDTO {
  id: string;
  user_id: string;
  username: string;
  start_date: string;
  end_date: string;
  status: string;
  credit_cost: number;
  created_at: string;
}

import type { EquipmentReservationHistoryItem } from "@/types";

/**
 * Transforms reservation from reservations endpoint to equipment history format
 */
function transformReservationHistory(dto: ReservationHistoryDTO): EquipmentReservationHistoryItem {
  return {
    id: dto.id,
    userId: dto.user_id,
    username: dto.username,
    startDate: dto.start_date,
    endDate: dto.end_date,
    status: dto.status as EquipmentReservationHistoryItem["status"],
    creditCost: dto.credit_cost,
    createdAt: dto.created_at,
  };
}
