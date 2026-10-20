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
