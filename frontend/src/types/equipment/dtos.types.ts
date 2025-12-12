// =============================================================================
// BACKEND DTO TYPES (snake_case - Exact Go JSON Response Structure)
// =============================================================================

import type { PaginationResponseDTO } from "../api.types";

/**
 * Backend equipment DTO - mirrors Go EquipmentDTO struct
 * Source: backend/internal/types/equipment_types.go:8-22
 */
export interface EquipmentDTO {
  id: string;
  internal_id: string;
  type_id: string;
  type_name: string;
  name: string | null;
  description: string | null;
  status: string;
  credit_cost_per_day: number;
  image_url: string | null;
  is_favorite?: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at?: string;
}

/**
 * Backend equipment list response DTO
 * Source: backend/internal/types/equipment_types.go:52-55
 */
export interface EquipmentListResponseDTO {
  equipment: EquipmentDTO[];
  pagination: PaginationResponseDTO;
}

/**
 * Backend equipment type DTO
 */
export interface EquipmentTypeDTO {
  id: string;
  name: string;
  credit_cost_per_day: number;
  created_at: string;
}

/**
 * Backend equipment types list response
 */
export interface EquipmentTypesResponseDTO {
  equipment_types: EquipmentTypeDTO[];
}
