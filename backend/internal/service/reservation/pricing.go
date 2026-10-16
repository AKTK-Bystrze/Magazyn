package reservation

import (
	"magazyn/backend/internal/validation"
)

// CalculateReservationCost calculates the total credit cost for a reservation given the date range,
// the equipment type's daily credit cost, and whether the reservation is free.
func CalculateReservationCost(startDate, endDate string, creditCostPerDay int32, isFree bool) int32 {
	if isFree {
		return 0
	}
	days := int32(validation.CalculateDays(startDate, endDate)) //nolint:gosec // days is bounded by date range
	return days * creditCostPerDay
}
