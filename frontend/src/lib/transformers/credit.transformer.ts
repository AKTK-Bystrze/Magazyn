import type {
  CreditHistoryItem,
  CreditHistoryResponse,
} from "@/types";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/constants";

// =============================================================================
// BACKEND DTO TYPES (snake_case)
// =============================================================================

/**
 * Backend credit history item DTO structure (snake_case)
 */
interface CreditHistoryItemDTO {
  id: string;
  user_id: string;
  username: string;
  amount: number;
  reason: string;
  description: string | null;
  reservation_id: string | null;
  admin_id: string | null;
  admin_username: string | null;
  created_at: string;
}

/**
 * Backend credit history response DTO structure
 */
interface CreditHistoryResponseDTO {
  credit_history: CreditHistoryItemDTO[];
  current_balance: number;
  pagination: {
    page: number;
    per_page: number;
    total_items: number;
    total_pages: number;
  };
}

// =============================================================================
// RESPONSE TRANSFORMERS (Backend → Frontend: snake_case → camelCase)
// =============================================================================

/**
 * Transforms a single credit history item from backend to frontend format
 *
 * @param dto - Backend credit history item object with snake_case fields
 * @returns Frontend CreditHistoryItem with camelCase fields
 */
export function transformCreditHistoryItem(dto: CreditHistoryItemDTO): CreditHistoryItem {
  return {
    id: dto.id,
    userId: dto.user_id,
    username: dto.username,
    amount: dto.amount,
    reason: dto.reason as CreditHistoryItem["reason"],
    description: dto.description,
    reservationId: dto.reservation_id,
    adminId: dto.admin_id,
    adminUsername: dto.admin_username,
    createdAt: dto.created_at,
  };
}

/**
 * Transforms credit history response from backend to frontend format
 *
 * @param data - Backend response (unknown for safety)
 * @returns Transformed CreditHistoryResponse with camelCase fields and pagination
 */
export function transformCreditHistoryResponse(data: unknown): CreditHistoryResponse {
  const dto = data as CreditHistoryResponseDTO;

  return {
    creditHistory: (dto.credit_history || []).map(transformCreditHistoryItem),
    currentBalance: dto.current_balance ?? 0,
    pagination: {
      page: dto.pagination?.page ?? 1,
      perPage: dto.pagination?.per_page ?? DEFAULT_PAGE_SIZE,
      totalItems: dto.pagination?.total_items ?? 0,
      totalPages: dto.pagination?.total_pages ?? 0,
    },
  };
}
