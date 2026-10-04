package types

// Calendar API Types
// CalendarAvailabilityQuery represents query parameters for calendar availability
type CalendarAvailabilityQuery struct {
	EquipmentID *string `json:"equipment_id"` // Optional UUID filter
	StartDate   *string `json:"start_date"`   // Optional, defaults to today (YYYY-MM-DD)
	Days        int     `json:"days"`         // Number of days (1-90, default 30)
}
type CalendarEntryDTO struct {
	Date              string  `json:"date"` // YYYY-MM-DD format
	EquipmentID       string  `json:"equipment_id"`
	EquipmentName     string  `json:"equipment_name"`
	IsAvailable       bool    `json:"is_available"`
	ReservationID     *string `json:"reservation_id,omitempty"`     // Present when unavailable
	ReservationStatus *string `json:"reservation_status,omitempty"` // PENDING, RENTED, RETURNED, DENIED
}
type CalendarAvailabilityResponse struct {
	Calendar []CalendarEntryDTO `json:"calendar"`
}

// Analytics API Types
// AnalyticsPeriodQuery represents query parameters for analytics endpoints
type AnalyticsPeriodQuery struct {
	Year        *int    `json:"year"`         // Optional year filter
	Month       *int    `json:"month"`        // Optional month filter (1-12)
	EquipmentID *string `json:"equipment_id"` // Optional equipment filter (equipment-stats only)
}
type PeriodDTO struct {
	Year  *int `json:"year,omitempty"`
	Month *int `json:"month,omitempty"`
}
type TopRenterDTO struct {
	UserID           string `json:"user_id"`
	Username         string `json:"username"`
	ReservationCount int    `json:"reservation_count"`
	DaysRented       int    `json:"days_rented"`
}
type EquipmentStatsDTO struct {
	EquipmentID       string         `json:"equipment_id"`
	EquipmentName     string         `json:"equipment_name"`
	EquipmentType     string         `json:"equipment_type"`
	TotalReservations int            `json:"total_reservations"`
	TotalDaysRented   int            `json:"total_days_rented"`
	UtilizationRate   float64        `json:"utilization_rate"` // 0.0 to 1.0
	TopRenters        []TopRenterDTO `json:"top_renters"`
}
type EquipmentStatsResponse struct {
	EquipmentStats []EquipmentStatsDTO `json:"equipment_stats"`
	Period         PeriodDTO           `json:"period"`
}
type UserStatsDTO struct {
	UserID                string  `json:"user_id"`
	Username              string  `json:"username"`
	TotalReservations     int     `json:"total_reservations"`
	TotalCreditsSpent     int     `json:"total_credits_spent"`
	LastReservationDate   *string `json:"last_reservation_date"` // YYYY-MM-DD or null
	FavoriteEquipmentType *string `json:"favorite_equipment_type"`
}
type UserStatsResponse struct {
	UserStats []UserStatsDTO `json:"user_stats"`
	Period    PeriodDTO      `json:"period"`
}
