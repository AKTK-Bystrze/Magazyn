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
  /** Reservation start date (YYYY-MM-DD) */
  startDate: string;
  /** Reservation end date (YYYY-MM-DD) */
  endDate: string;
  status: Enums<"reservation_status">;
  /** Calculated total credit cost */
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
  /** Reservation start date (YYYY-MM-DD) */
  startDate: string;
  /** Reservation end date (YYYY-MM-DD) */
  endDate: string;
};

/**
 * Command to create one or more reservations (POST /reservations)
 */
export type CreateReservationsCommand = {
  reservations: CreateReservationItem[];
  /** Optional user ID, admin only (for creating on behalf of others) */
  userId?: string;
  /** Optional flag, admin only (for creating free reservations) */
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
  /** Net credit adjustment: positive indicates additional charge, negative indicates refund */
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
 * Admin dashboard summary (GET /reservations/dashboard)
 * Matches backend ReservationDashboardSummary DTO
 */
export type ReservationDashboardSummary = {
  pending_reservations: number;
  overdue_reservations: number;
  active_today: number;
};

import type { ReservationSortOption } from "@/lib/config/constants/reservation/status";
export type { ReservationSortOption };

/**
 * Filter state for reservation list view
 * Synced with URL search params for shareable links
 */
export type ReservationFilterState = {
  page: number;
  perPage: number;
  status: Enums<"reservation_status"> | "ALL";
  sort: ReservationSortOption;
  search?: string;
  userId?: string;
  typeId?: string;
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
  /** Net credit adjustment: positive indicates a refund to user, negative indicates additional charge */
  adjustment: number;
  /** User's projected balance after applying the adjustment */
  newBalance: number;
  isSignificantExtension: boolean;
};

/**
 * Date modification command for API
 * Subset of UpdateReservationCommand focused on dates
 */
export type ModifyDatesCommand = {
  /** New reservation start date (YYYY-MM-DD) */
  startDate: string;
  /** New reservation end date (YYYY-MM-DD) */
  endDate: string;
};
