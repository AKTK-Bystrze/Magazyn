package types

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

type PublicProfilesInsert struct {
	CreatedAt     *string `json:"created_at"`
	CreditBalance *int32  `json:"credit_balance"`
	Email         string  `json:"email"`
	ID            string  `json:"id"`
	IsEnabled     *bool   `json:"is_enabled"`
	Role          *string `json:"role"`
	UpdatedAt     *string `json:"updated_at"`
	Username      string  `json:"username"`
}

type PublicProfilesUpdate struct {
	CreatedAt     *string `json:"created_at"`
	CreditBalance *int32  `json:"credit_balance"`
	Email         *string `json:"email"`
	ID            *string `json:"id"`
	IsEnabled     *bool   `json:"is_enabled"`
	Role          *string `json:"role"`
	UpdatedAt     *string `json:"updated_at"`
	Username      *string `json:"username"`
}

type PublicEquipmentTypesSelect struct {
	CreatedAt        string `json:"created_at"`
	CreditCostPerDay int32  `json:"credit_cost_per_day"`
	ID               string `json:"id"`
	Name             string `json:"name"`
}

type PublicEquipmentTypesInsert struct {
	CreatedAt        *string `json:"created_at"`
	CreditCostPerDay int32   `json:"credit_cost_per_day"`
	ID               *string `json:"id"`
	Name             string  `json:"name"`
}

type PublicEquipmentTypesUpdate struct {
	CreatedAt        *string `json:"created_at"`
	CreditCostPerDay *int32  `json:"credit_cost_per_day"`
	ID               *string `json:"id"`
	Name             *string `json:"name"`
}

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

type PublicEquipmentInsert struct {
	CreatedAt   *string `json:"created_at"`
	Description *string `json:"description"`
	ID          *string `json:"id"`
	ImagePath   *string `json:"image_path"`
	InternalID  string  `json:"internal_id"`
	IsArchived  *bool   `json:"is_archived"`
	Name        *string `json:"name"`
	Status      *string `json:"status"`
	TypeID      string  `json:"type_id"`
	UpdatedAt   *string `json:"updated_at"`
}

type PublicEquipmentUpdate struct {
	CreatedAt   *string `json:"created_at"`
	Description *string `json:"description"`
	ID          *string `json:"id"`
	ImagePath   *string `json:"image_path"`
	InternalID  *string `json:"internal_id"`
	IsArchived  *bool   `json:"is_archived"`
	Name        *string `json:"name"`
	Status      *string `json:"status"`
	TypeID      *string `json:"type_id"`
	UpdatedAt   *string `json:"updated_at"`
}

type PublicReservationsSelect struct {
	CreatedAt   string  `json:"created_at"`
	EndDate     string  `json:"end_date"`
	EquipmentID string  `json:"equipment_id"`
	ID          string  `json:"id"`
	StartDate   string  `json:"start_date"`
	Status      string  `json:"status"`
	UpdatedAt   *string `json:"updated_at"`
	UserID      string  `json:"user_id"`
}

type PublicReservationsInsert struct {
	CreatedAt   *string `json:"created_at"`
	EndDate     string  `json:"end_date"`
	EquipmentID string  `json:"equipment_id"`
	ID          *string `json:"id"`
	StartDate   string  `json:"start_date"`
	Status      *string `json:"status"`
	UpdatedAt   *string `json:"updated_at"`
	UserID      string  `json:"user_id"`
}

type PublicReservationsUpdate struct {
	CreatedAt   *string `json:"created_at"`
	EndDate     *string `json:"end_date"`
	EquipmentID *string `json:"equipment_id"`
	ID          *string `json:"id"`
	StartDate   *string `json:"start_date"`
	Status      *string `json:"status"`
	UpdatedAt   *string `json:"updated_at"`
	UserID      *string `json:"user_id"`
}

type PublicCreditHistorySelect struct {
	AdminID       *string `json:"admin_id"`
	Amount        int32   `json:"amount"`
	CreatedAt     string  `json:"created_at"`
	Description   *string `json:"description"`
	ID            string  `json:"id"`
	Reason        string  `json:"reason"`
	ReservationID *string `json:"reservation_id"`
	UserID        string  `json:"user_id"`
}

type PublicCreditHistoryInsert struct {
	AdminID       *string `json:"admin_id"`
	Amount        int32   `json:"amount"`
	CreatedAt     *string `json:"created_at"`
	Description   *string `json:"description"`
	ID            *string `json:"id"`
	Reason        string  `json:"reason"`
	ReservationID *string `json:"reservation_id"`
	UserID        string  `json:"user_id"`
}

type PublicCreditHistoryUpdate struct {
	AdminID       *string `json:"admin_id"`
	Amount        *int32  `json:"amount"`
	CreatedAt     *string `json:"created_at"`
	Description   *string `json:"description"`
	ID            *string `json:"id"`
	Reason        *string `json:"reason"`
	ReservationID *string `json:"reservation_id"`
	UserID        *string `json:"user_id"`
}

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

type PublicCreditRequestsInsert struct {
	AdminID     *string `json:"admin_id"`
	AdminNote   *string `json:"admin_note"`
	Amount      int32   `json:"amount"`
	CreatedAt   *string `json:"created_at"`
	Description string  `json:"description"`
	ID          *string `json:"id"`
	Status      *string `json:"status"`
	UpdatedAt   *string `json:"updated_at"`
	UserID      string  `json:"user_id"`
}

type PublicCreditRequestsUpdate struct {
	AdminID     *string `json:"admin_id"`
	AdminNote   *string `json:"admin_note"`
	Amount      *int32  `json:"amount"`
	CreatedAt   *string `json:"created_at"`
	Description *string `json:"description"`
	ID          *string `json:"id"`
	Status      *string `json:"status"`
	UpdatedAt   *string `json:"updated_at"`
	UserID      *string `json:"user_id"`
}

type PublicMaintenanceLogsSelect struct {
	AdminID        *string `json:"admin_id"`
	CreatedAt      string  `json:"created_at"`
	EquipmentID    string  `json:"equipment_id"`
	ID             string  `json:"id"`
	NewStatus      string  `json:"new_status"`
	Notes          *string `json:"notes"`
	PreviousStatus *string `json:"previous_status"`
}

type PublicMaintenanceLogsInsert struct {
	AdminID        *string `json:"admin_id"`
	CreatedAt      *string `json:"created_at"`
	EquipmentID    string  `json:"equipment_id"`
	ID             *string `json:"id"`
	NewStatus      string  `json:"new_status"`
	Notes          *string `json:"notes"`
	PreviousStatus *string `json:"previous_status"`
}

type PublicMaintenanceLogsUpdate struct {
	AdminID        *string `json:"admin_id"`
	CreatedAt      *string `json:"created_at"`
	EquipmentID    *string `json:"equipment_id"`
	ID             *string `json:"id"`
	NewStatus      *string `json:"new_status"`
	Notes          *string `json:"notes"`
	PreviousStatus *string `json:"previous_status"`
}

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

type PublicReservationHistoryInsert struct {
	ChangedByUserID *string `json:"changed_by_user_id"`
	CreatedAt       *string `json:"created_at"`
	EndDate         string  `json:"end_date"`
	EquipmentID     string  `json:"equipment_id"`
	ID              *string `json:"id"`
	ReservationID   string  `json:"reservation_id"`
	StartDate       string  `json:"start_date"`
	Status          string  `json:"status"`
	UserID          string  `json:"user_id"`
}

type PublicReservationHistoryUpdate struct {
	ChangedByUserID *string `json:"changed_by_user_id"`
	CreatedAt       *string `json:"created_at"`
	EndDate         *string `json:"end_date"`
	EquipmentID     *string `json:"equipment_id"`
	ID              *string `json:"id"`
	ReservationID   *string `json:"reservation_id"`
	StartDate       *string `json:"start_date"`
	Status          *string `json:"status"`
	UserID          *string `json:"user_id"`
}

type PublicAnalyticsEquipmentStatsSelect struct {
	EquipmentID       *string  `json:"equipment_id"`
	EquipmentName     *string  `json:"equipment_name"`
	TotalDaysRented   *int64   `json:"total_days_rented"`
	TotalReservations *int64   `json:"total_reservations"`
	UtilizationRate   *float64 `json:"utilization_rate"`
}

type PublicAnalyticsUserStatsSelect struct {
	LastReservationDate *string `json:"last_reservation_date"`
	TotalCreditsSpent   *int64  `json:"total_credits_spent"`
	TotalReservations   *int64  `json:"total_reservations"`
	UserID              *string `json:"user_id"`
	Username            *string `json:"username"`
}
