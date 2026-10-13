package types

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

// ModifyDatesResponse represents the response when modifying reservation dates.
type ModifyDatesResponse struct {
	ID        string `json:"id"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Status    string `json:"status"`
	UpdatedAt string `json:"updated_at"`
	OldCost   int32  `json:"old_cost"`
	NewCost   int32  `json:"new_cost"`
	// CreditAdjustment indicates credit refund (positive) or charge (negative).
	CreditAdjustment int32 `json:"credit_adjustment"`
	NewBalance       int32 `json:"new_balance"`
}

// ReservationListResponse represents the paginated response for listing reservations.
type ReservationListResponse struct {
	Reservations []ReservationListItem `json:"reservations"`
	Pagination   Pagination            `json:"pagination"`
}

// ReservationDashboardSummary represents aggregated dashboard metrics for reservations.
type ReservationDashboardSummary struct {
	PendingReservations int64 `json:"pending_reservations"`
	OverdueReservations int64 `json:"overdue_reservations"`
	ActiveToday         int64 `json:"active_today"`
}

// CreateReservationItem represents a single item in a reservation creation request.
type CreateReservationItem struct {
	EquipmentID string `json:"equipment_id"`
	StartDate   string `json:"start_date"`
	EndDate     string `json:"end_date"`
}

// CreateReservationsCommand represents the command to create one or more reservations.
type CreateReservationsCommand struct {
	Reservations []CreateReservationItem `json:"reservations"`
	// UserID allows an admin to create a reservation on behalf of another user.
	UserID *string `json:"user_id,omitempty"`
	// FreeReservation allows an admin to waive credit costs.
	FreeReservation *bool `json:"free_reservation,omitempty"`
}

// UpdateReservationCommand represents the payload for updating reservation dates or status.
type UpdateReservationCommand struct {
	StartDate *string `json:"start_date,omitempty"`
	EndDate   *string `json:"end_date,omitempty"`
	Status    *string `json:"status,omitempty"`
}

// BulkStatusUpdateResponse contains counts of updated and refunded reservations.
type BulkStatusUpdateResponse struct {
	UpdatedCount int32 `json:"updated_count"`
	RefundCount  int32 `json:"refund_count"`
}

// BulkUpdateReservationsCommand represents the command to transition multiple reservations.
type BulkUpdateReservationsCommand struct {
	ReservationIDs []string `json:"reservation_ids"`
	Status         string   `json:"status"`
}

// ReservationListQuery represents filters and pagination for listing reservations.
type ReservationListQuery struct {
	Page          int     `json:"page"`
	PerPage       int     `json:"per_page"`
	Status        *string `json:"status"`
	UserID        *string `json:"user_id"`
	EquipmentID   *string `json:"equipment_id"`
	StartDateFrom *string `json:"start_date_from"`
	StartDateTo   *string `json:"start_date_to"`
	Scope         *string `json:"scope"`
	// BypassRLS indicates whether to bypass Row Level Security when listing all reservations.
	BypassRLS bool `json:"-"`
}
