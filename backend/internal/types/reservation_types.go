package types

// DTOs (Data Transfer Objects) - Reservation API Responses
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
	IsFree        bool    `json:"is_free"`
}
type ReservationDetail struct {
	ReservationListItem
	UserEmail           string                  `json:"user_email"`
	EquipmentInternalID string                  `json:"equipment_internal_id"`
	AuditTrail          []ReservationAuditEntry `json:"audit_trail"`
}
type ReservationAuditEntry struct {
	ID                string  `json:"id"`
	StartDate         string  `json:"start_date"`
	EndDate           string  `json:"end_date"`
	Status            string  `json:"status"`
	ChangedByUsername *string `json:"changed_by_username"`
	CreatedAt         string  `json:"created_at"`
}
type CreateReservationsResponse struct {
	Reservations     []ReservationListItem `json:"reservations"`
	TotalCreditCost  int32                 `json:"total_credit_cost"`
	RemainingBalance int32                 `json:"remaining_balance"`
}
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
type ModifyDatesResponse struct {
	ID               string `json:"id"`
	StartDate        string `json:"start_date"`
	EndDate          string `json:"end_date"`
	Status           string `json:"status"`
	UpdatedAt        string `json:"updated_at"`
	OldCost          int32  `json:"old_cost"`
	NewCost          int32  `json:"new_cost"`
	CreditAdjustment int32  `json:"credit_adjustment"` // positive = refund, negative = charge
	NewBalance       int32  `json:"new_balance"`
}
type ReservationListResponse struct {
	Reservations []ReservationListItem `json:"reservations"`
	Pagination   PaginationResponse    `json:"pagination"`
}
type ReservationDashboardSummary struct {
	PendingReservations int64 `json:"pending_reservations"`
	OverdueReservations int64 `json:"overdue_reservations"`
	ActiveToday         int64 `json:"active_today"`
}

// Command Models - Request Validation
// CreateReservationItem represents a single item in a create request
type CreateReservationItem struct {
	EquipmentID string `json:"equipment_id" validate:"required,uuid"`
	StartDate   string `json:"start_date" validate:"required,datetime=2006-01-02"`
	EndDate     string `json:"end_date" validate:"required,datetime=2006-01-02,gtefield=StartDate"`
}
type CreateReservationsCommand struct {
	Reservations    []CreateReservationItem `json:"reservations" validate:"required,min=1,dive"`
	UserID          *string                 `json:"user_id,omitempty" validate:"omitempty,uuid"`     // Admin only
	FreeReservation *bool                   `json:"free_reservation,omitempty" validate:"omitempty"` // Admin+ only
}
type UpdateReservationCommand struct {
	StartDate *string `json:"start_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	EndDate   *string `json:"end_date,omitempty" validate:"omitempty,datetime=2006-01-02"`
	Status    *string `json:"status,omitempty" validate:"omitempty,oneof=PENDING RENTED RETURNED DENIED CANCELLED"`
}
type BulkStatusUpdateResponse struct {
	UpdatedCount int32 `json:"updated_count"`
	RefundCount  int32 `json:"refund_count"`
}
type BulkUpdateReservationsCommand struct {
	ReservationIDs []string `json:"reservation_ids" validate:"required,min=1,dive,uuid"`
	Status         string   `json:"status" validate:"required,oneof=RENTED RETURNED DENIED"`
}

// Queries
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
