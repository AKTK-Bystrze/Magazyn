import type {
  CreateReservationsCommand,
  CreateReservationItem,
  ReservationListItem,
  ReservationListResponse,
  ReservationDetail,
  ReservationAuditEntry,
  UpdateReservationCommand,
} from "@/types";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/constants";

// =============================================================================
// REQUEST TRANSFORMERS (Frontend → Backend: camelCase → snake_case)
// =============================================================================

/**
 * Transforms frontend CreateReservationsCommand to backend format
 * Converts camelCase to snake_case for API submission
 *
 * @param command - Frontend reservation command with camelCase fields
 * @returns Backend-compatible object with snake_case fields
 */
export function transformCreateReservationsCommand(
  command: CreateReservationsCommand
): unknown {
  return {
    reservations: command.reservations.map((item) => ({
      equipment_id: item.equipmentId,
      start_date: item.startDate,
      end_date: item.endDate,
    })),
    ...(command.userId && { user_id: command.userId }),
    ...(command.freeReservation !== undefined && { free_reservation: command.freeReservation }),
  };
}

/**
 * Transforms a single reservation item from frontend to backend format
 *
 * @param item - Frontend reservation item with camelCase fields
 * @returns Backend-compatible object with snake_case fields
 */
export function transformCreateReservationItem(
  item: CreateReservationItem
): unknown {
  return {
    equipment_id: item.equipmentId,
    start_date: item.startDate,
    end_date: item.endDate,
  };
}

/**
 * Transforms UpdateReservationCommand to backend format
 *
 * @param command - Frontend update command
 * @returns Backend-compatible object with snake_case fields
 */
export function transformUpdateReservationCommand(
  command: UpdateReservationCommand
): unknown {
  const result: Record<string, unknown> = {};

  if (command.startDate !== undefined) {
    result.start_date = command.startDate;
  }
  if (command.endDate !== undefined) {
    result.end_date = command.endDate;
  }
  if (command.status !== undefined) {
    result.status = command.status;
  }

  return result;
}

// =============================================================================
// RESPONSE TRANSFORMERS (Backend → Frontend: snake_case → camelCase)
// =============================================================================

/**
 * Backend reservation DTO structure (snake_case)
 */
interface ReservationDTO {
  id: string;
  user_id: string;
  username: string;
  equipment_id: string;
  equipment_name: string;
  equipment_type: string;
  start_date: string;
  end_date: string;
  status: string;
  credit_cost: number;
  created_at: string;
  updated_at: string | null;
}

/**
 * Backend reservation detail DTO with additional fields
 */
interface ReservationDetailDTO extends ReservationDTO {
  user_email: string;
  equipment_internal_id: string;
  audit_trail: Array<{
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    changed_by_username: string | null;
    created_at: string;
  }>;
}

/**
 * Backend paginated response structure
 */
interface ReservationListResponseDTO {
  reservations: ReservationDTO[];
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

/**
 * Transforms a single reservation from backend to frontend format
 *
 * @param dto - Backend reservation object
 * @returns Frontend ReservationListItem
 */
export function transformReservationItem(dto: ReservationDTO): ReservationListItem {
  return {
    id: dto.id,
    userId: dto.user_id,
    username: dto.username,
    equipmentId: dto.equipment_id,
    equipmentName: dto.equipment_name,
    equipmentType: dto.equipment_type,
    startDate: dto.start_date,
    endDate: dto.end_date,
    status: dto.status as ReservationListItem["status"],
    creditCost: dto.credit_cost,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  };
}

/**
 * Transforms paginated reservation list response
 *
 * @param data - Backend response (unknown for safety)
 * @returns Transformed ReservationListResponse
 */
export function transformReservationListResponse(
  data: unknown
): ReservationListResponse {
  const dto = data as ReservationListResponseDTO;

  return {
    reservations: (dto.reservations || []).map(transformReservationItem),
    pagination: {
      page: dto.pagination?.page ?? 1,
      perPage: dto.pagination?.per_page ?? DEFAULT_PAGE_SIZE,
      totalItems: dto.pagination?.total_items ?? 0,
      totalPages: dto.pagination?.total_pages ?? 0,
    },
  };
}

/**
 * Transforms audit trail entry from backend format
 *
 * @param dto - Backend audit entry
 * @returns Frontend ReservationAuditEntry
 */
function transformAuditEntry(dto: ReservationDetailDTO["audit_trail"][0]): ReservationAuditEntry {
  return {
    id: dto.id,
    startDate: dto.start_date,
    endDate: dto.end_date,
    status: dto.status as ReservationAuditEntry["status"],
    changedByUsername: dto.changed_by_username,
    createdAt: dto.created_at,
  };
}

/**
 * Transforms detailed reservation response with audit trail
 *
 * @param data - Backend response (unknown for safety)
 * @returns Transformed ReservationDetail
 */
export function transformReservationDetail(data: unknown): ReservationDetail {
  const dto = data as ReservationDetailDTO;

  return {
    id: dto.id,
    userId: dto.user_id,
    username: dto.username,
    equipmentId: dto.equipment_id,
    equipmentName: dto.equipment_name,
    equipmentType: dto.equipment_type,
    startDate: dto.start_date,
    endDate: dto.end_date,
    status: dto.status as ReservationDetail["status"],
    creditCost: dto.credit_cost,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    userEmail: dto.user_email,
    equipmentInternalId: dto.equipment_internal_id,
    auditTrail: (dto.audit_trail || []).map(transformAuditEntry),
  };
}

