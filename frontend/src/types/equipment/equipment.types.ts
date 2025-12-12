// =============================================================================
// EQUIPMENT & EQUIPMENT TYPE TYPES
// =============================================================================

import type { Enums } from "../../db/database.types";

export type EquipmentStatus = Enums<"equipment_status">;

export interface EquipmentSearchParams {
  search?: string;
  type_id?: string;
  status?: EquipmentStatus;
  page: number;
  perPage: number;
}

/**
 * Equipment type with pricing
 * From equipment_types table
 */
export type EquipmentType = {
  id: string;
  name: string;
  creditCostPerDay: number; // from equipment_types.credit_cost_per_day
  createdAt: string;
};

/**
 * Command to create equipment type (POST /equipment-types)
 */
export type CreateEquipmentTypeCommand = {
  name: string;
  creditCostPerDay: number;
};

/**
 * Command to update equipment type (PATCH /equipment-types/:id)
 */
export type UpdateEquipmentTypeCommand = {
  name?: string;
  creditCostPerDay?: number;
};

/**
 * Equipment item with type information
 * Combines data from equipment and equipment_types tables
 */
export type Equipment = {
  id: string;
  internalId: string; // from equipment.internal_id
  typeId: string; // from equipment.type_id
  typeName: string; // from equipment_types.name (JOIN)
  name: string | null;
  description: string | null;
  status: Enums<"equipment_status">;
  creditCostPerDay: number; // from equipment_types.credit_cost_per_day (JOIN)
  imageUrl: string | null; // from equipment.image_path (transformed to URL)
  isFavorite: boolean; // calculated field
  isArchived: boolean; // from equipment.is_archived
  createdAt: string;
  updatedAt: string | null;
};

/**
 * Equipment in search results (GET /equipment)
 * Matches the structure defined in .ai/equipment-view-implementation-plan.md
 */
export type EquipmentSearchItem = {
  id: string;
  name: string;
  description: string | null;
  typeId: string;
  type: {
    id: string;
    name: string;
    creditCostPerDay: number;
  };
  status: Enums<"equipment_status">;
  imagePath: string | null;
  internalId: string;
  isFavorite?: boolean;
};

export type EquipmentListItem = EquipmentSearchItem;

/**
 * Equipment availability check response (GET /equipment/:id/availability)
 */
export type EquipmentAvailability = {
  equipmentId: string;
  isAvailable: boolean;
  conflictingReservations: Array<{
    id: string;
    startDate: string; // YYYY-MM-DD
    endDate: string;
    status: Enums<"reservation_status">;
  }>;
};

/**
 * Command to create equipment (POST /equipment)
 */
export type CreateEquipmentCommand = {
  internalId: string;
  typeId: string;
  name?: string;
  description?: string;
  status?: Enums<"equipment_status">; // defaults to 'ok'
  imagePath?: string; // path in Supabase storage
};

/**
 * Command to update equipment (PATCH /equipment/:id)
 */
export type UpdateEquipmentCommand = {
  name?: string;
  description?: string;
  status?: Enums<"equipment_status">;
  imagePath?: string | null;
};
