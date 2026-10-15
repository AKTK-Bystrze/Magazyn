import type { Enums } from "../../db/database.types";

export type EquipmentStatus = Enums<"equipment_status">;

export interface EquipmentSearchParams {
  search?: string;
  typeId?: string;
  status?: EquipmentStatus;
  page: number;
  perPage: number;
  /** Availability start date filter (ISO format: YYYY-MM-DD) */
  availableFrom?: string;
  /** Availability end date filter (ISO format: YYYY-MM-DD) */
  availableTo?: string;
}

/**
 * Equipment type with pricing
 * From equipment_types table
 */
export type EquipmentType = {
  id: string;
  name: string;
  /** Base cost in credits per day */
  creditCostPerDay: number;
  createdAt: string;
};

/**
 * Equipment item with type information
 * Combines data from equipment and equipment_types tables
 */
export type Equipment = {
  id: string;
  /** Unique inventory identifier */
  internalId: string;
  typeId: string;
  typeName: string;
  name: string | null;
  description: string | null;
  status: Enums<"equipment_status">;
  /** Cost in credits per day joined from equipment type */
  creditCostPerDay: number;
  imageUrl: string | null;
  isFavorite: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string | null;
};

/**
 * Equipment in search results (GET /equipment)
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

/**
 * Equipment availability check response (GET /equipment/:id/availability)
 */
export type EquipmentAvailability = {
  equipmentId: string;
  isAvailable: boolean;
  conflictingReservations: Array<{
    id: string;
    /** Reservation start date (YYYY-MM-DD) */
    startDate: string;
    /** Reservation end date (YYYY-MM-DD) */
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
  status: "PENDING" | "RENTED" | "RETURNED" | "CANCELLED";
  creditCost: number;
  createdAt: string;
};
