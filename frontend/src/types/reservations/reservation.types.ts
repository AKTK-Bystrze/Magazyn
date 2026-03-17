// =============================================================================
// RESERVATION TYPES
// =============================================================================

import type { Enums } from "../../db/database.types";

/**
 * Reservation with user and equipment information
 * Combines data from reservations, profiles, equipment, and equipment_types
 */
export type Reservation = {
  id: string;
  userId: string; // from reservations.user_id
  username: string; // from profiles.username (JOIN)
  equipmentId: string; // from reservations.equipment_id
  equipmentName: string; // from equipment.name (JOIN)
  equipmentType: string; // from equipment_types.name (JOIN)
  startDate: string; // from reservations.start_date (YYYY-MM-DD)
  endDate: string; // from reservations.end_date
  status: Enums<"reservation_status">;
  creditCost: number; // calculated field
  createdAt: string; // ISO 8601
  updatedAt: string | null;
};

/**
 * Reservation in list view (GET /reservations)
 */
export type ReservationListItem = Reservation;

/**
 * Audit trail entry for reservation history
 */
export type ReservationAuditEntry = {
  id: string;
  startDate: string;
  endDate: string;
  status: Enums<"reservation_status">;
  changedByUsername: string | null; // from changed_by_user_id → profiles.username
  createdAt: string;
};

/**
 * Reservation with complete audit trail (GET /reservations/:id)
 */
export type ReservationDetail = Reservation & {
  userEmail: string; // from profiles.email
  equipmentInternalId: string; // from equipment.internal_id
  auditTrail: ReservationAuditEntry[];
};

/**
 * Single reservation item for creation
 */
export type CreateReservationItem = {
  equipmentId: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
};

/**
 * Command to create one or more reservations (POST /reservations)
 */
export type CreateReservationsCommand = {
  reservations: CreateReservationItem[];
  userId?: string; // optional, admin only (for creating on behalf of others)
  freeReservation?: boolean; // optional, admin only (for creating free reservations)
};

/**
 * Response after creating reservations (POST /reservations)
 */
export type CreateReservationsResponse = {
  reservations: Array<{
    id: string;
    equipmentId: string;
    equipmentName: string;
    startDate: string;
    endDate: string;
    status: Enums<"reservation_status">;
    creditCost: number;
  }>;
  totalCreditCost: number;
  remainingBalance: number;
};

/**
 * Command to update reservation (PATCH /reservations/:id)
 */
export type UpdateReservationCommand = {
  startDate?: string;
  endDate?: string;
  status?: Enums<"reservation_status">;
};

/**
 * Response after updating reservation
 */
export type UpdateReservationResponse = {
  id: string;
  equipmentId: string;
  startDate: string;
  endDate: string;
  status: Enums<"reservation_status">;
  creditCost: number;
  creditAdjustment: number; // positive = charge, negative = refund
  remainingBalance: number;
  updatedAt: string;
};

/**
 * Command for bulk status update (PATCH /reservations/bulk)
 */
export type BulkUpdateReservationsCommand = {
  reservationIds: string[];
  status: Enums<"reservation_status">;
};

/**
 * Response from atomic bulk update RPC
 */
export type BulkStatusUpdateResponse = {
  updated_count: number;
  refund_count: number;
};

/**
 * Overdue reservation item
 */
export type OverdueItem = {
  reservationId: string;
  userId: string;
  username: string;
  userEmail: string;
  equipmentId: string;
  equipmentName: string;
  endDate: string;
  daysOverdue: number;
  status: Enums<"reservation_status">;
};

/**
 * Admin dashboard summary (GET /reservations/dashboard)
 */
export type ReservationDashboardSummary = {
  summary: {
    pendingCount: number;
    overdueCount: number;
    todayCount: number;
  };
  overdueItems: OverdueItem[];
};

// =============================================================================
// VIEW STATE TYPES
// =============================================================================

/**
 * Sort options for reservation list
 */
export type ReservationSortOption = "created_desc" | "date_asc" | "date_desc";

/**
 * Filter state for reservation list view
 * Synced with URL search params for shareable links
 */
export type ReservationFilterState = {
  page: number;
  perPage: number;
  status: Enums<"reservation_status"> | "ALL";
  sort: ReservationSortOption;
  query?: string;
  scope: "my" | "all";
};

/**
 * Props for reservation list components
 */
export type ReservationListProps = {
  mode: "user" | "admin";
  currentUserId?: string;
  currentUserBalance?: number;
  initialFilters?: Partial<ReservationFilterState>;
};

/**
 * Paginated response for reservation list
 */
export type ReservationListResponse = {
  reservations: ReservationListItem[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
  };
};

/**
 * Grouped reservation containing multiple items with same dates
 * Used for collapsing reservations created on the same date range
 */
export type GroupedReservation = {
  groupKey: string; // `${userId}-${startDate}-${endDate}`
  userId: string;
  username: string;
  startDate: string;
  endDate: string;
  status: string; // Aggregated: same status or "MIXED"
  totalCreditCost: number; // Sum of all items
  items: ReservationListItem[]; // Individual reservations
  createdAt: string; // Earliest created_at
};

// =============================================================================
// DATE MODIFICATION TYPES
// =============================================================================

/**
 * Credit adjustment calculation result
 * Used for previewing changes before confirmation
 */
export type CreditAdjustmentInfo = {
  originalDays: number;
  newDays: number;
  originalCost: number;
  newCost: number;
  adjustment: number; // positive = refund, negative = charge
  newBalance: number; // user's balance after adjustment
  isSignificantExtension: boolean;
};

/**
 * Date modification command for API
 * Subset of UpdateReservationCommand focused on dates
 */
export type ModifyDatesCommand = {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};
