package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

type CalendarRepository interface {
	// GetEquipmentForCalendar retrieves non-archived equipment for calendar display.
	// If equipmentID is provided, only that equipment is returned.
	GetEquipmentForCalendar(ctx context.Context, equipmentID *string) ([]types.PublicEquipmentSelect, error)
	// GetReservationsInDateRange retrieves all reservations that overlap with the given date range.
	// If equipmentID is provided, only reservations for that equipment are returned.
	// Only includes PENDING and RENTED reservations (active reservations).
	GetReservationsInDateRange(ctx context.Context, startDate string, endDate string, equipmentID *string) ([]types.PublicReservationsSelect, error)
}
type AnalyticsRepository interface {
	// GetEquipmentStats retrieves aggregated equipment statistics from the analytics view.
	// Filters can be applied by year, month, and equipment_id.
	GetEquipmentStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsEquipmentStatsSelect, error)
	// GetUserStats retrieves aggregated user statistics from the analytics view.
	// Filters can be applied by year and month.
	GetUserStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsUserStatsSelect, error)
	// GetTopRentersForEquipment retrieves top renters for a specific equipment item.
	// Returns users ordered by reservation count, limited to the specified count.
	GetTopRentersForEquipment(ctx context.Context, equipmentID string, limit int) ([]types.TopRenterDTO, error)
	// GetFavoriteEquipmentTypeForUser determines the most frequently rented equipment type for a user.
	GetFavoriteEquipmentTypeForUser(ctx context.Context, userID string) (*string, error)
}
