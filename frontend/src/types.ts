// =============================================================================
// DTO and Command Model Types for Equipment Rental System API
// =============================================================================
// All DTOs use camelCase field names to match JSON wire protocol (per dto-hierarchy.md)
// Database entities use snake_case but are transformed by Go backend

// Re-export database types for reference
export type * from "./db/database.types";
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./db/database.types";

export type EquipmentStatus = Enums<"equipment_status">;

export interface EquipmentSearchParams {
  q?: string;
  type_id?: string;
  status?: EquipmentStatus;
  page: number;
  limit: number;
}

// =============================================================================
// AUTHENTICATION DTOs
// =============================================================================

/**
 * Session information for authenticated user
 * Returned by GET /auth/session
 */
export type SessionInfo = {
  userId: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number;
  isEnabled: boolean;
  expiresAt: string; // ISO 8601
};

/**
 * Login request body
 * POST /auth/login
 */
export type LoginRequest = {
  email: string;
};

// =============================================================================
// USER PROFILE DTOs
// =============================================================================

/**
 * User profile with credit balance
 * Derived from profiles table, field names in camelCase
 */
export type UserProfile = {
  id: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number; // from profiles.credit_balance
  createdAt: string; // from profiles.created_at (ISO 8601)
  updatedAt: string | null;
};

/**
 * User in list view (GET /users)
 * Subset of UserProfile without updated_at
 */
export type UserListItem = {
  id: string;
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance: number;
  createdAt: string;
};

/**
 * Command to create user (POST /users)
 * SuperAdmin only
 */
export type CreateUserCommand = {
  email: string;
  username: string;
  role: Enums<"user_role">;
  creditBalance?: number; // optional, defaults to 0
};

/**
 * Command to update user (PATCH /users/:id)
 * SuperAdmin only, all fields optional
 */
export type UpdateUserCommand = {
  email?: string;
  role?: Enums<"user_role">;
  creditBalance?: number;
};

// =============================================================================
// EQUIPMENT TYPE DTOs
// =============================================================================

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

// =============================================================================
// EQUIPMENT DTOs
// =============================================================================

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
 */
export type EquipmentListItem = Equipment;

/**
 * Equipment details with maintenance logs (GET /equipment/:id)
 */
export type EquipmentDetail = Equipment & {
  maintenanceLogs: MaintenanceLog[];
};

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

// =============================================================================
// RESERVATION DTOs
// =============================================================================

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
 * Response from bulk update
 */
export type BulkUpdateReservationsResponse = {
  successful: Array<{
    id: string;
    status: Enums<"reservation_status">;
  }>;
  failed: Array<{
    id: string;
    error: string;
  }>;
  summary: {
    total: number;
    successfulCount: number;
    failedCount: number;
  };
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
// CREDIT HISTORY DTOs
// =============================================================================

/**
 * Credit transaction record
 * From credit_history table
 */
export type CreditHistoryItem = {
  id: string;
  userId: string; // from credit_history.user_id
  username: string; // from profiles.username (JOIN)
  amount: number; // negative for charges, positive for credits
  reason: Enums<"credit_transaction_reason">;
  description: string | null;
  reservationId: string | null;
  adminId: string | null;
  adminUsername: string | null; // from admin_id → profiles.username
  createdAt: string;
};

/**
 * Credit history with current balance (GET /credit-history)
 */
export type CreditHistoryResponse = {
  creditHistory: CreditHistoryItem[];
  pagination: PaginationMeta;
  currentBalance: number;
};

// =============================================================================
// CREDIT REQUEST DTOs
// =============================================================================

/**
 * Credit request with status
 * From credit_requests table
 */
export type CreditRequest = {
  id: string;
  userId: string;
  username: string; // from profiles.username
  amount: number;
  description: string;
  status: Enums<"credit_request_status">;
  adminId: string | null;
  adminUsername: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string | null;
};

/**
 * Credit request with approved amount (for responses)
 */
export type CreditRequestWithApproval = CreditRequest & {
  approvedAmount?: number;
};

/**
 * Command to create credit request (POST /credit-requests)
 */
export type CreateCreditRequestCommand = {
  amount: number; // must be > 0
  description: string; // min 10 chars, max 500
};

/**
 * Command to approve/deny credit request (PATCH /credit-requests/:id)
 */
export type UpdateCreditRequestCommand = {
  status: "APPROVED" | "DENIED";
  approvedAmount?: number; // required if status=APPROVED
  adminNote?: string;
};

// =============================================================================
// MAINTENANCE LOG DTOs
// =============================================================================

/**
 * Equipment maintenance record
 * From maintenance_logs table
 */
export type MaintenanceLog = {
  id: string;
  equipmentId: string;
  previousStatus: Enums<"equipment_status"> | null;
  newStatus: Enums<"equipment_status">;
  notes: string | null;
  adminId: string | null;
  adminUsername: string | null; // from admin_id → profiles.username
  createdAt: string;
};

/**
 * Command to create maintenance log (POST /equipment/:id/maintenance-logs)
 */
export type CreateMaintenanceLogCommand = {
  notes?: string; // optional but recommended, max 1000 chars
};

// =============================================================================
// CALENDAR & ANALYTICS DTOs
// =============================================================================

/**
 * Single day availability status (GET /calendar/availability)
 */
export type CalendarDay = {
  date: string; // YYYY-MM-DD
  equipmentId: string;
  equipmentName: string;
  isAvailable: boolean;
  reservationId: string | null;
  reservationStatus: Enums<"reservation_status"> | null;
};

/**
 * Top equipment renter info
 */
export type TopRenter = {
  userId: string;
  username: string;
  reservationCount: number;
  daysRented: number;
};

/**
 * Equipment usage statistics (GET /analytics/equipment-stats)
 */
export type EquipmentStats = {
  equipmentId: string;
  equipmentName: string;
  equipmentType: string;
  totalReservations: number;
  totalDaysRented: number;
  utilizationRate: number; // 0.0 to 1.0
  topRenters: TopRenter[];
};

/**
 * User activity statistics (GET /analytics/user-stats)
 */
export type UserStats = {
  userId: string;
  username: string;
  totalReservations: number;
  totalCreditsSpent: number;
  lastReservationDate: string | null;
  favoriteEquipmentType: string | null;
};

/**
 * Analytics period filter
 */
export type AnalyticsPeriod = {
  year: number;
  month: number | null; // 1-12, null for entire year
};

// =============================================================================
// SHARED TYPES
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
