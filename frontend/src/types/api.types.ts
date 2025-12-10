// =============================================================================
// PAGINATION & API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Pagination query parameters
 */
export type PaginationParams = {
  page?: number; // default: 1
  perPage?: number; // default: 25, allowed: 10/25/50/100
};

/**
 * Pagination metadata in responses
 */
export type PaginationMeta = {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
};

/**
 * Backend pagination response DTO
 * Source: backend/internal/types/equipment_types.go:58-63
 */
export interface PaginationResponseDTO {
  page: number;
  per_page: number;
  total_items: number;
  total_pages: number;
}

/**
 * Generic paginated response wrapper
 */
export type PaginatedResponse<T> = {
  data: T[];
  pagination: PaginationMeta;
};

/**
 * Standard API error response
 */
export type ApiError = {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
};

/**
 * Success message response
 */
export type SuccessMessage = {
  message: string;
};
