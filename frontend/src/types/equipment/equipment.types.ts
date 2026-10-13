import type { Enums } from "../../db/database.types";

export type EquipmentStatus = Enums<"equipment_status">;

export interface EquipmentSearchParams {
  search?: string;
  typeId?: string;
  status?: EquipmentStatus;
  page: number;
  perPage: number;
  availableFrom?: string;
  availableTo?: string;
}

/**
 * Equipment type with pricing
 * From equipment_types table
 */
export type EquipmentType = {
  id: string;
  name: string;
  creditCostPerDay: number;
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
  internalId: string;
  typeId: string;
  typeName: string;
  name: string | null;
  description: string | null;
  status: Enums<"equipment_status">;
  creditCostPerDay: number;
  imageUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
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
    startDate: string;
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
  status?: Enums<"equipment_status">;
  imagePath?: string;
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

/**
 * Filter state for Equipment Manager view
 * Used for admin equipment list with search, type, and status filters
 */
export type EquipmentManagerFilterState = EquipmentSearchParams;

/**
 * Equipment reservation history item
 * Used in EquipmentDetailsSheet to show reservation history
 */
export type EquipmentReservationHistoryItem = {
  id: string;
  userId: string;
  username: string;
  startDate: string;
  endDate: string;
  status: "PENDING" | "RENTED" | "RETURNED" | "DENIED";
  creditCost: number;
  createdAt: string;
};
