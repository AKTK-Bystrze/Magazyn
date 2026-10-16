package validation

import (
	"fmt"
	"time"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
)

// CalculateDays returns the inclusive number of days between two ISO date strings (YYYY-MM-DD).
// If dates cannot be parsed or if endDate is before startDate, it returns 0.
// For valid ranges where startDate <= endDate, it returns at least 1.
func CalculateDays(startDate, endDate string) int {
	start, err := time.Parse(constants.DateFormatISO, startDate)
	if err != nil {
		return 0
	}
	end, err := time.Parse(constants.DateFormatISO, endDate)
	if err != nil {
		return 0
	}
	if end.Before(start) {
		return 0
	}
	return int(end.Sub(start).Hours()/24) + 1
}

// CalculateReservationCost calculates the total credit cost for a reservation given the date range,
// the daily credit cost, and whether the reservation is free.
func CalculateReservationCost(startDate, endDate string, creditCostPerDay int32, isFree bool) int32 {
	if isFree {
		return 0
	}
	days := int32(CalculateDays(startDate, endDate)) //nolint:gosec // days is bounded by date range
	return days * creditCostPerDay
}

// ValidateISODate verifies that a date string matches the ISO date format (YYYY-MM-DD).
func ValidateISODate(dateStr string) error {
	if _, err := time.Parse(constants.DateFormatISO, dateStr); err != nil {
		return types.NewValidationError(
			fmt.Sprintf("Invalid date format '%s', expected YYYY-MM-DD", dateStr),
			map[string]string{"date": dateStr},
		)
	}
	return nil
}
