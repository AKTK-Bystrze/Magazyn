import type { Enums } from "../../db/database.types";

/**
 * Reservation with user and equipment information
 * Combines data from reservations, profiles, equipment, and equipment_types
 */
export type Reservation = {
  id: string;
  userId: string;
  username: string;
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  startDate: string;
  endDate: string;
  status: Enums<"reservation_status">;
  creditCost: number;
  createdAt: string;
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
  changedByUsername: string | null;
  createdAt: string;
};

/**
 * Reservation with complete audit trail (GET /reservations/:id)
 */
export type ReservationDetail = Reservation & {
  userEmail: string;
  equipmentInternalId: string;
  auditTrail: ReservationAuditEntry[];
};

/**
 * Single reservation item for creation
 */
export type CreateReservationItem = {
  equipmentId: string;
  startDate: string;
  endDate: string;
};

/**
 * Command to create one or more reservations (POST /reservations)
 */
export type CreateReservationsCommand = {
  reservations: CreateReservationItem[];
  userId?: string;
  freeReservation?: boolean;
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
  creditAdjustment: number;
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
  groupKey: string;
  userId: string;
  username: string;
  startDate: string;
  endDate: string;
  status: string;
  totalCreditCost: number;
  items: ReservationListItem[];
  createdAt: string;
};

/**
 * Credit adjustment calculation result
 * Used for previewing changes before confirmation
 */
export type CreditAdjustmentInfo = {
  originalDays: number;
  newDays: number;
  originalCost: number;
  newCost: number;
  adjustment: number;
  newBalance: number;
  isSignificantExtension: boolean;
};

/**
 * Date modification command for API
 * Subset of UpdateReservationCommand focused on dates
 */
export type ModifyDatesCommand = {
  startDate: string;
  endDate: string;
};
