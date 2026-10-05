package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

type CalendarRepository interface {
	GetEquipmentForCalendar(ctx context.Context, equipmentID *string) ([]types.PublicEquipmentSelect, error)
	GetReservationsInDateRange(ctx context.Context, startDate string, endDate string, equipmentID *string) ([]types.PublicReservationsSelect, error)
}
type AnalyticsRepository interface {
	GetEquipmentStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsEquipmentStatsSelect, error)
	GetUserStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsUserStatsSelect, error)
	GetTopRentersForEquipment(ctx context.Context, equipmentID string, limit int) ([]types.TopRenterDTO, error)
	GetFavoriteEquipmentTypeForUser(ctx context.Context, userID string) (*string, error)
}
