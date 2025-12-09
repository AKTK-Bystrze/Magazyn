package types

// ============================================================================
// DTOs (Data Transfer Objects) - Equipment API Responses
// ============================================================================

// EquipmentDTO represents equipment with joined type information for list view
type EquipmentDTO struct {
	ID               string  `json:"id"`
	InternalID       string  `json:"internal_id"`
	TypeID           string  `json:"type_id"`
	TypeName         string  `json:"type_name"`
	Name             *string `json:"name"`
	Description      *string `json:"description"`
	Status           string  `json:"status"`
	CreditCostPerDay int32   `json:"credit_cost_per_day"`
	ImageURL         *string `json:"image_url"`
	IsFavorite       *bool   `json:"is_favorite,omitempty"` // Only in list view
	IsArchived       bool    `json:"is_archived"`
	CreatedAt        string  `json:"created_at"`
	UpdatedAt        *string `json:"updated_at,omitempty"`
}

// EquipmentDetailDTO represents equipment with maintenance logs for detail view
type EquipmentDetailDTO struct {
	ID               string              `json:"id"`
	InternalID       string              `json:"internal_id"`
	TypeID           string              `json:"type_id"`
	TypeName         string              `json:"type_name"`
	Name             *string             `json:"name"`
	Description      *string             `json:"description"`
	Status           string              `json:"status"`
	CreditCostPerDay int32               `json:"credit_cost_per_day"`
	ImageURL         *string             `json:"image_url"`
	IsArchived       bool                `json:"is_archived"`
	CreatedAt        string              `json:"created_at"`
	UpdatedAt        *string             `json:"updated_at"`
	MaintenanceLogs  []MaintenanceLogDTO `json:"maintenance_logs"`
}

// MaintenanceLogDTO represents a maintenance log entry
type MaintenanceLogDTO struct {
	ID             string  `json:"id"`
	PreviousStatus *string `json:"previous_status"`
	NewStatus      string  `json:"new_status"`
	Notes          *string `json:"notes"`
	AdminUsername  string  `json:"admin_username"`
	CreatedAt      string  `json:"created_at"`
}

// EquipmentListResponse represents paginated list response
type EquipmentListResponse struct {
	Equipment  []EquipmentDTO     `json:"equipment"`
	Pagination PaginationResponse `json:"pagination"`
}

// PaginationResponse represents generic pagination metadata
type PaginationResponse struct {
	Page       int `json:"page"`
	PerPage    int `json:"per_page"`
	TotalItems int `json:"total_items"`
	TotalPages int `json:"total_pages"`
}

// AvailabilityResponse represents equipment availability check result
type AvailabilityResponse struct {
	EquipmentID             string                   `json:"equipment_id"`
	IsAvailable             bool                     `json:"is_available"`
	ConflictingReservations []ConflictingReservation `json:"conflicting_reservations"`
}

// ConflictingReservation represents a reservation that conflicts with requested dates
type ConflictingReservation struct {
	ID        string `json:"id"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
	Status    string `json:"status"`
}

// MessageResponse represents a generic success message response
type MessageResponse struct {
	Message string `json:"message"`
}

// ============================================================================
// Command Models - Request Validation
// ============================================================================

// CreateEquipmentCommand represents a request to create new equipment
type CreateEquipmentCommand struct {
	InternalID  string  `json:"internal_id"`
	TypeID      string  `json:"type_id"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	ImagePath   *string `json:"image_path"`
}

// UpdateEquipmentCommand represents a request to update equipment
type UpdateEquipmentCommand struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Status      *string `json:"status"`
	ImagePath   *string `json:"image_path"`
}

// EquipmentListQuery represents filters for listing equipment
type EquipmentListQuery struct {
	Page            int     `json:"page"`
	PerPage         int     `json:"per_page"`
	TypeID          *string `json:"type_id"`
	Search          *string `json:"search"`
	Status          *string `json:"status"`
	IncludeArchived bool    `json:"include_archived"`
}

// AvailabilityQuery represents parameters for availability check
type AvailabilityQuery struct {
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
}

// ============================================================================
// Error Response
// ============================================================================

// ErrorResponse represents standardized error response
type ErrorResponse struct {
	Error   string      `json:"error"`
	Code    string      `json:"code,omitempty"`
	Details interface{} `json:"details,omitempty"`
}

// ============================================================================
// Equipment Type DTOs
// ============================================================================

// CreateEquipmentTypeRequest represents the payload for creating a new equipment type
type CreateEquipmentTypeRequest struct {
	Name             string `json:"name" validate:"required,max=100"`
	CreditCostPerDay int32  `json:"credit_cost_per_day" validate:"required,min=0"`
}

// EquipmentTypeListResponse represents the response for listing equipment types
type EquipmentTypeListResponse struct {
	EquipmentTypes []PublicEquipmentTypesSelect `json:"equipment_types"`
}
