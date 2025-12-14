package types

// ============================================================================
// DTOs (Data Transfer Objects) - Reservation API Responses
// ============================================================================

// ReservationListItem represents a reservation with joined equipment and user info for lists
type ReservationListItem struct {
	ID            string  `json:"id"`
	UserID        string  `json:"user_id"`
	Username      string  `json:"username"`
	EquipmentID   string  `json:"equipment_id"`
	EquipmentName string  `json:"equipment_name"`
	EquipmentType string  `json:"equipment_type"`
	StartDate     string  `json:"start_date"`
	EndDate       string  `json:"end_date"`
	Status        string  `json:"status"`
	CreditCost    int32   `json:"credit_cost"`
	CreatedAt     string  `json:"created_at"`
	UpdatedAt     *string `json:"updated_at"`
}

// ReservationDetail represents detailed reservation info including audit trail
type ReservationDetail struct {
	ReservationListItem
	UserEmail           string                  `json:"user_email"`
	EquipmentInternalID string                  `json:"equipment_internal_id"`
	AuditTrail          []ReservationAuditEntry `json:"audit_trail"`
}

// ReservationAuditEntry represents an entry in the reservation's history
type ReservationAuditEntry struct {
	ID                string  `json:"id"`
	StartDate         string  `json:"start_date"`
	EndDate           string  `json:"end_date"`
	Status            string  `json:"status"`
	ChangedByUsername *string `json:"changed_by_username"`
	CreatedAt         string  `json:"created_at"`
}

// CreateReservationsResponse represents the response after creating reservations
type CreateReservationsResponse struct {
	Reservations     []ReservationListItem `json:"reservations"`
	TotalCreditCost  int32                 `json:"total_credit_cost"`
	RemainingBalance int32                 `json:"remaining_balance"`
}

// UpdateReservationResponse represents the response after updating a reservation
type UpdateReservationResponse struct {
	ID               string `json:"id"`
	EquipmentID      string `json:"equipment_id"`
	StartDate        string `json:"start_date"`
	EndDate          string `json:"end_date"`
	Status           string `json:"status"`
	CreditCost       int32  `json:"credit_cost"`
	CreditAdjustment int32  `json:"credit_adjustment"`
	RemainingBalance int32  `json:"remaining_balance"`
	UpdatedAt        string `json:"updated_at"`
}

// ReservationListResponse represents paginated list response
type ReservationListResponse struct {
	Reservations []ReservationListItem `json:"reservations"`
	Pagination   PaginationResponse    `json:"pagination"`
}

// ReservationDashboardSummary represents stats for the admin dashboard
type ReservationDashboardSummary struct {
	PendingReservations int64 `json:"pending_reservations"`
	OverdueReservations int64 `json:"overdue_reservations"`
	ActiveToday         int64 `json:"active_today"`
}

// ============================================================================
// Command Models - Request Validation
// ============================================================================

// CreateReservationItem represents a single item in a create request
type CreateReservationItem struct {
	EquipmentID string `json:"equipment_id" validate:"required,uuid"`
	StartDate   string `json:"start_date" validate:"required,datetime=2006-01-02"`
	EndDate     string `json:"end_date" validate:"required,datetime=2006-01-02,gtefield=StartDate"`
}

// CreateReservationsCommand represents the request body to create reservations
type CreateReservationsCommand struct {
	Reservations []CreateReservationItem `json:"reservations" validate:"required,min=1,dive"`
	UserID       *string                 `json:"user_id,omitempty" validate:"omitempty,uuid"` // Admin only
}

// UpdateReservationCommand represents the request body to update a reservation
type UpdateReservationCommand struct {
	StartDate *string `json:"start_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	EndDate   *string `json:"end_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	Status    *string `json:"status,omitempty" validate:"omitempty,oneof=PENDING RENTED RETURNED DENIED CANCELLED"`
}

// BulkUpdateReservationsCommand represents the request body for bulk status update
type BulkUpdateReservationsCommand struct {
	ReservationIDs []string `json:"reservation_ids" validate:"required,min=1,dive,uuid"`
	Status         string   `json:"status" validate:"required,oneof=RENTED RETURNED DENIED"`
}

// ============================================================================
// Queries
// ============================================================================

// ReservationListQuery represents filters for listing reservations
type ReservationListQuery struct {
	Page          int     `json:"page"`
	PerPage       int     `json:"per_page"`
	Status        *string `json:"status"`
	UserID        *string `json:"user_id"`
	EquipmentID   *string `json:"equipment_id"`
	StartDateFrom *string `json:"start_date_from"`
	StartDateTo   *string `json:"start_date_to"`
	BypassRLS     bool    `json:"-"` // If true, use unauthenticated client (for "all" scope)
}
