// Package types defines shared DTOs, entity models, and domain errors for the application.
package types

// CalendarAvailabilityQuery represents query parameters for calendar availability.
type CalendarAvailabilityQuery struct {
	// EquipmentID is an optional UUID filter for a single equipment item.
	EquipmentID *string `json:"equipment_id"`
	// StartDate is an optional starting date in YYYY-MM-DD format (defaults to today).
	StartDate *string `json:"start_date"`
	// Days is the number of days to inspect (1-90, default 30).
	Days int `json:"days"`
}

// CalendarEntryDTO represents daily availability status for an equipment item.
type CalendarEntryDTO struct {
	// Date is the calendar date in YYYY-MM-DD format.
	Date          string `json:"date"`
	EquipmentID   string `json:"equipment_id"`
	EquipmentName string `json:"equipment_name"`
	IsAvailable   bool   `json:"is_available"`
	// ReservationID is present when the equipment is unavailable.
	ReservationID *string `json:"reservation_id,omitempty"`
	// ReservationStatus represents the status of the blocking reservation.
	ReservationStatus *string `json:"reservation_status,omitempty"`
}

// CalendarAvailabilityResponse represents the calendar availability response envelope.
type CalendarAvailabilityResponse struct {
	Calendar []CalendarEntryDTO `json:"calendar"`
}

// AnalyticsPeriodQuery represents query parameters for analytics endpoints.
type AnalyticsPeriodQuery struct {
	// Year is the optional year filter.
	Year *int `json:"year"`
	// Month is the optional month filter (1-12).
	Month *int `json:"month"`
	// EquipmentID is the optional equipment filter (equipment-stats only).
	EquipmentID *string `json:"equipment_id"`
}

// PeriodDTO represents the reporting period for analytics results.
type PeriodDTO struct {
	Year  *int `json:"year,omitempty"`
	Month *int `json:"month,omitempty"`
}

// TopRenterDTO represents rental statistics for a specific user.
type TopRenterDTO struct {
	UserID           string `json:"user_id"`
	Username         string `json:"username"`
	ReservationCount int    `json:"reservation_count"`
	DaysRented       int    `json:"days_rented"`
}

// EquipmentStatsDTO represents aggregated utilization statistics for an equipment item.
type EquipmentStatsDTO struct {
	EquipmentID       string `json:"equipment_id"`
	EquipmentName     string `json:"equipment_name"`
	EquipmentType     string `json:"equipment_type"`
	TotalReservations int    `json:"total_reservations"`
	TotalDaysRented   int    `json:"total_days_rented"`
	// UtilizationRate represents rental days / total days in period (0.0 to 1.0).
	UtilizationRate float64        `json:"utilization_rate"`
	TopRenters      []TopRenterDTO `json:"top_renters"`
}

// EquipmentStatsResponse contains equipment statistics and the reporting period.
type EquipmentStatsResponse struct {
	EquipmentStats []EquipmentStatsDTO `json:"equipment_stats"`
	Period         PeriodDTO           `json:"period"`
}

// UserStatsDTO represents reservation and credit expenditure statistics for a user.
type UserStatsDTO struct {
	UserID            string `json:"user_id"`
	Username          string `json:"username"`
	TotalReservations int    `json:"total_reservations"`
	TotalCreditsSpent int    `json:"total_credits_spent"`
	// LastReservationDate is the date of the user's most recent reservation in YYYY-MM-DD format.
	LastReservationDate   *string `json:"last_reservation_date"`
	FavoriteEquipmentType *string `json:"favorite_equipment_type"`
}

// UserStatsResponse contains user statistics and the reporting period.
type UserStatsResponse struct {
	UserStats []UserStatsDTO `json:"user_stats"`
	Period    PeriodDTO      `json:"period"`
}
