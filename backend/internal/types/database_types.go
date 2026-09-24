package types

// PublicProfilesSelect represents the PublicProfilesSelect structure.
type PublicProfilesSelect struct {
	CreatedAt     string  `json:"created_at"`
	CreditBalance int32   `json:"credit_balance"`
	Email         string  `json:"email"`
	ID            string  `json:"id"`
	IsEnabled     bool    `json:"is_enabled"`
	Role          string  `json:"role"`
	UpdatedAt     *string `json:"updated_at"`
	Username      string  `json:"username"`
}

// PublicProfilesInsert represents the PublicProfilesInsert structure.
type PublicProfilesInsert struct {
	CreatedAt     *string `json:"created_at,omitempty"`
	CreditBalance *int32  `json:"credit_balance,omitempty"`
	Email         string  `json:"email"`
	ID            string  `json:"id,omitempty"`
	IsEnabled     *bool   `json:"is_enabled,omitempty"`
	Role          *string `json:"role,omitempty"`
	UpdatedAt     *string `json:"updated_at,omitempty"`
	Username      string  `json:"username"`
}

// PublicProfilesUpdate represents the PublicProfilesUpdate structure.
type PublicProfilesUpdate struct {
	CreatedAt     *string `json:"created_at,omitempty"`
	CreditBalance *int32  `json:"credit_balance,omitempty"`
	Email         *string `json:"email,omitempty"`
	ID            *string `json:"id,omitempty"`
	IsEnabled     *bool   `json:"is_enabled,omitempty"`
	Role          *string `json:"role,omitempty"`
	UpdatedAt     *string `json:"updated_at,omitempty"`
	Username      *string `json:"username,omitempty"`
}

// PublicEquipmentTypesSelect represents the PublicEquipmentTypesSelect structure.
type PublicEquipmentTypesSelect struct {
	CreatedAt        string `json:"created_at"`
	CreditCostPerDay int32  `json:"credit_cost_per_day"`
	ID               string `json:"id"`
	Name             string `json:"name"`
}

// PublicEquipmentTypesInsert represents the PublicEquipmentTypesInsert structure.
type PublicEquipmentTypesInsert struct {
	CreatedAt        *string `json:"created_at,omitempty"`
	CreditCostPerDay int32   `json:"credit_cost_per_day"`
	ID               *string `json:"id,omitempty"`
	Name             string  `json:"name"`
}

// PublicEquipmentTypesUpdate represents the PublicEquipmentTypesUpdate structure.
type PublicEquipmentTypesUpdate struct {
	CreatedAt        *string `json:"created_at,omitempty"`
	CreditCostPerDay *int32  `json:"credit_cost_per_day,omitempty"`
	ID               *string `json:"id,omitempty"`
	Name             *string `json:"name,omitempty"`
}

// PublicEquipmentSelect represents the PublicEquipmentSelect structure.
type PublicEquipmentSelect struct {
	CreatedAt   string  `json:"created_at"`
	Description *string `json:"description"`
	ID          string  `json:"id"`
	ImagePath   *string `json:"image_path"`
	InternalID  string  `json:"internal_id"`
	IsArchived  bool    `json:"is_archived"`
	Name        *string `json:"name"`
	Status      string  `json:"status"`
	TypeID      string  `json:"type_id"`
	UpdatedAt   *string `json:"updated_at"`
}

// PublicEquipmentInsert represents the PublicEquipmentInsert structure.
type PublicEquipmentInsert struct {
	CreatedAt   *string `json:"created_at,omitempty"`
	Description *string `json:"description,omitempty"`
	ID          *string `json:"id,omitempty"`
	ImagePath   *string `json:"image_path,omitempty"`
	InternalID  string  `json:"internal_id"`
	IsArchived  *bool   `json:"is_archived,omitempty"`
	Name        *string `json:"name,omitempty"`
	Status      *string `json:"status,omitempty"`
	TypeID      string  `json:"type_id"`
	UpdatedAt   *string `json:"updated_at,omitempty"`
}

// PublicEquipmentUpdate represents the PublicEquipmentUpdate structure.
type PublicEquipmentUpdate struct {
	CreatedAt   *string `json:"created_at,omitempty"`
	Description *string `json:"description,omitempty"`
	ID          *string `json:"id,omitempty"`
	ImagePath   *string `json:"image_path,omitempty"`
	InternalID  *string `json:"internal_id,omitempty"`
	IsArchived  *bool   `json:"is_archived,omitempty"`
	Name        *string `json:"name,omitempty"`
	Status      *string `json:"status,omitempty"`
	TypeID      *string `json:"type_id,omitempty"`
	UpdatedAt   *string `json:"updated_at,omitempty"`
}

// PublicReservationsSelect represents the PublicReservationsSelect structure.
type PublicReservationsSelect struct {
	CreatedAt   string  `json:"created_at"`
	EndDate     string  `json:"end_date"`
	EquipmentID string  `json:"equipment_id"`
	ID          string  `json:"id"`
	IsFree      bool    `json:"is_free"`
	StartDate   string  `json:"start_date"`
	Status      string  `json:"status"`
	UpdatedAt   *string `json:"updated_at"`
	UserID      string  `json:"user_id"`
}

// PublicReservationsInsert represents the PublicReservationsInsert structure.
type PublicReservationsInsert struct {
	CreatedAt   *string `json:"created_at,omitempty"`
	EndDate     string  `json:"end_date"`
	EquipmentID string  `json:"equipment_id"`
	ID          *string `json:"id,omitempty"`
	IsFree      bool    `json:"is_free"`
	StartDate   string  `json:"start_date"`
	Status      *string `json:"status,omitempty"`
	UpdatedAt   *string `json:"updated_at,omitempty"`
	UserID      string  `json:"user_id"`
}

// PublicReservationsUpdate represents the PublicReservationsUpdate structure.
type PublicReservationsUpdate struct {
	CreatedAt   *string `json:"created_at,omitempty"`
	EndDate     *string `json:"end_date,omitempty"`
	EquipmentID *string `json:"equipment_id,omitempty"`
	ID          *string `json:"id,omitempty"`
	StartDate   *string `json:"start_date,omitempty"`
	Status      *string `json:"status,omitempty"`
	UpdatedAt   *string `json:"updated_at,omitempty"`
	UserID      *string `json:"user_id,omitempty"`
}

// PublicCreditHistorySelect represents the PublicCreditHistorySelect structure.
type PublicCreditHistorySelect struct {
	AuthorID      *string `json:"author_id"`
	Amount        int32   `json:"amount"`
	CreatedAt     string  `json:"created_at"`
	Description   *string `json:"description"`
	ID            string  `json:"id"`
	Reason        string  `json:"reason"`
	ReservationID *string `json:"reservation_id"`
	UserID        string  `json:"user_id"`
}

// PublicCreditHistoryInsert represents the PublicCreditHistoryInsert structure.
type PublicCreditHistoryInsert struct {
	AuthorID      *string `json:"author_id,omitempty"`
	Amount        int32   `json:"amount"`
	CreatedAt     *string `json:"created_at,omitempty"`
	Description   *string `json:"description,omitempty"`
	ID            *string `json:"id,omitempty"`
	Reason        string  `json:"reason"`
	ReservationID *string `json:"reservation_id,omitempty"`
	UserID        string  `json:"user_id"`
}

// PublicCreditHistoryUpdate represents the PublicCreditHistoryUpdate structure.
type PublicCreditHistoryUpdate struct {
	AuthorID      *string `json:"author_id,omitempty"`
	Amount        *int32  `json:"amount,omitempty"`
	CreatedAt     *string `json:"created_at,omitempty"`
	Description   *string `json:"description,omitempty"`
	ID            *string `json:"id,omitempty"`
	Reason        *string `json:"reason,omitempty"`
	ReservationID *string `json:"reservation_id,omitempty"`
	UserID        *string `json:"user_id,omitempty"`
}

// PublicCreditRequestsSelect represents the PublicCreditRequestsSelect structure.
type PublicCreditRequestsSelect struct {
	AdminID     *string `json:"admin_id"`
	AdminNote   *string `json:"admin_note"`
	Amount      int32   `json:"amount"`
	CreatedAt   string  `json:"created_at"`
	Description string  `json:"description"`
	ID          string  `json:"id"`
	Status      string  `json:"status"`
	UpdatedAt   *string `json:"updated_at"`
	UserID      string  `json:"user_id"`
}

// PublicCreditRequestsInsert represents the PublicCreditRequestsInsert structure.
type PublicCreditRequestsInsert struct {
	AdminID     *string `json:"admin_id,omitempty"`
	AdminNote   *string `json:"admin_note,omitempty"`
	Amount      int32   `json:"amount"`
	CreatedAt   *string `json:"created_at,omitempty"`
	Description string  `json:"description"`
	ID          *string `json:"id,omitempty"`
	Status      *string `json:"status,omitempty"`
	UpdatedAt   *string `json:"updated_at,omitempty"`
	UserID      string  `json:"user_id"`
}

// PublicCreditRequestsUpdate represents the PublicCreditRequestsUpdate structure.
type PublicCreditRequestsUpdate struct {
	AdminID     *string `json:"admin_id,omitempty"`
	AdminNote   *string `json:"admin_note,omitempty"`
	Amount      *int32  `json:"amount,omitempty"`
	CreatedAt   *string `json:"created_at,omitempty"`
	Description *string `json:"description,omitempty"`
	ID          *string `json:"id,omitempty"`
	Status      *string `json:"status,omitempty"`
	UpdatedAt   *string `json:"updated_at,omitempty"`
	UserID      *string `json:"user_id,omitempty"`
}

// PublicMaintenanceLogsSelect represents the PublicMaintenanceLogsSelect structure.
type PublicMaintenanceLogsSelect struct {
	AdminID        *string `json:"admin_id"`
	CreatedAt      string  `json:"created_at"`
	EquipmentID    string  `json:"equipment_id"`
	ID             string  `json:"id"`
	NewStatus      string  `json:"new_status"`
	Notes          *string `json:"notes"`
	PreviousStatus *string `json:"previous_status"`
}

// PublicMaintenanceLogsInsert represents the PublicMaintenanceLogsInsert structure.
type PublicMaintenanceLogsInsert struct {
	AdminID        *string `json:"admin_id,omitempty"`
	CreatedAt      *string `json:"created_at,omitempty"`
	EquipmentID    string  `json:"equipment_id"`
	ID             *string `json:"id,omitempty"`
	NewStatus      string  `json:"new_status"`
	Notes          *string `json:"notes,omitempty"`
	PreviousStatus *string `json:"previous_status,omitempty"`
}

// PublicMaintenanceLogsUpdate represents the PublicMaintenanceLogsUpdate structure.
type PublicMaintenanceLogsUpdate struct {
	AdminID        *string `json:"admin_id,omitempty"`
	CreatedAt      *string `json:"created_at,omitempty"`
	EquipmentID    *string `json:"equipment_id,omitempty"`
	ID             *string `json:"id,omitempty"`
	NewStatus      *string `json:"new_status,omitempty"`
	Notes          *string `json:"notes,omitempty"`
	PreviousStatus *string `json:"previous_status,omitempty"`
}

// PublicReservationHistorySelect represents the PublicReservationHistorySelect structure.
type PublicReservationHistorySelect struct {
	ChangedByUserID *string `json:"changed_by_user_id"`
	CreatedAt       string  `json:"created_at"`
	EndDate         string  `json:"end_date"`
	EquipmentID     string  `json:"equipment_id"`
	ID              string  `json:"id"`
	ReservationID   string  `json:"reservation_id"`
	StartDate       string  `json:"start_date"`
	Status          string  `json:"status"`
	UserID          string  `json:"user_id"`
}

// PublicReservationHistoryInsert represents the PublicReservationHistoryInsert structure.
type PublicReservationHistoryInsert struct {
	ChangedByUserID *string `json:"changed_by_user_id,omitempty"`
	CreatedAt       *string `json:"created_at,omitempty"`
	EndDate         string  `json:"end_date"`
	EquipmentID     string  `json:"equipment_id"`
	ID              *string `json:"id,omitempty"`
	ReservationID   string  `json:"reservation_id"`
	StartDate       string  `json:"start_date"`
	Status          string  `json:"status"`
	UserID          string  `json:"user_id"`
}

// PublicReservationHistoryUpdate represents the PublicReservationHistoryUpdate structure.
type PublicReservationHistoryUpdate struct {
	ChangedByUserID *string `json:"changed_by_user_id,omitempty"`
	CreatedAt       *string `json:"created_at,omitempty"`
	EndDate         *string `json:"end_date,omitempty"`
	EquipmentID     *string `json:"equipment_id,omitempty"`
	ID              *string `json:"id,omitempty"`
	ReservationID   *string `json:"reservation_id,omitempty"`
	StartDate       *string `json:"start_date,omitempty"`
	Status          *string `json:"status,omitempty"`
	UserID          *string `json:"user_id,omitempty"`
}

// PublicAnalyticsEquipmentStatsSelect represents the PublicAnalyticsEquipmentStatsSelect structure.
type PublicAnalyticsEquipmentStatsSelect struct {
	EquipmentID       *string  `json:"equipment_id"`
	EquipmentName     *string  `json:"equipment_name"`
	TotalDaysRented   *int64   `json:"total_days_rented"`
	TotalReservations *int64   `json:"total_reservations"`
	UtilizationRate   *float64 `json:"utilization_rate"`
}

// PublicAnalyticsUserStatsSelect represents the PublicAnalyticsUserStatsSelect structure.
type PublicAnalyticsUserStatsSelect struct {
	LastReservationDate *string `json:"last_reservation_date"`
	TotalCreditsSpent   *int64  `json:"total_credits_spent"`
	TotalReservations   *int64  `json:"total_reservations"`
	UserID              *string `json:"user_id"`
	Username            *string `json:"username"`
}
