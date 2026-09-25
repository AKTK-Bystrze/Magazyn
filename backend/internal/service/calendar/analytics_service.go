package calendar

import (
	"context"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

// ============================================================================
// Analytics Service Interface
// ============================================================================

// AnalyticsService defines operations for equipment and user analytics
type AnalyticsService interface {
	GetEquipmentStats(ctx context.Context, query types.AnalyticsPeriodQuery) (*types.EquipmentStatsResponse, error)

	GetUserStats(ctx context.Context, query types.AnalyticsPeriodQuery) (*types.UserStatsResponse, error)
}

// ============================================================================
// Analytics Service Implementation
// ============================================================================

type analyticsService struct {
	analyticsRepo repository.AnalyticsRepository
	typeRepo      repository.EquipmentTypeRepository
}

// NewAnalyticsService creates a new instance of AnalyticsService
func NewAnalyticsService(analyticsRepo repository.AnalyticsRepository, typeRepo repository.EquipmentTypeRepository) AnalyticsService {
	return &analyticsService{
		analyticsRepo: analyticsRepo,
		typeRepo:      typeRepo,
	}
}

// GetEquipmentStats retrieves equipment usage statistics with top renters
func (s *analyticsService) GetEquipmentStats(ctx context.Context, query types.AnalyticsPeriodQuery) (*types.EquipmentStatsResponse, error) {
	logger.Infof(ctx, "GetEquipmentStats - Year: %v, Month: %v, EquipmentID: %v", query.Year, query.Month, query.EquipmentID)

	rawStats, err := s.analyticsRepo.GetEquipmentStats(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch equipment stats: %v", err)
		return nil, types.NewInternalError("Failed to fetch equipment stats", err)
	}

	stats := make([]types.EquipmentStatsDTO, 0, len(rawStats))
	for _, raw := range rawStats {
		if raw.EquipmentID == nil {
			continue
		}

		equipmentName := ""
		if raw.EquipmentName != nil {
			equipmentName = *raw.EquipmentName
		}

		totalReservations := 0
		if raw.TotalReservations != nil {
			totalReservations = int(*raw.TotalReservations)
		}

		totalDaysRented := 0
		if raw.TotalDaysRented != nil {
			totalDaysRented = int(*raw.TotalDaysRented)
		}

		utilizationRate := 0.0
		if raw.UtilizationRate != nil {
			utilizationRate = *raw.UtilizationRate
		}

		topRenters, err := s.analyticsRepo.GetTopRentersForEquipment(ctx, *raw.EquipmentID, constants.TopRentersLimit)
		if err != nil {
			logger.Warnf(ctx, "Failed to fetch top renters for equipment %s: %v", *raw.EquipmentID, err)
			topRenters = []types.TopRenterDTO{}
		}

		dto := types.EquipmentStatsDTO{
			EquipmentID:       *raw.EquipmentID,
			EquipmentName:     equipmentName,
			EquipmentType:     "", // Will be populated if we have type info
			TotalReservations: totalReservations,
			TotalDaysRented:   totalDaysRented,
			UtilizationRate:   utilizationRate,
			TopRenters:        topRenters,
		}

		stats = append(stats, dto)
	}

	period := types.PeriodDTO{
		Year:  query.Year,
		Month: query.Month,
	}

	return &types.EquipmentStatsResponse{
		EquipmentStats: stats,
		Period:         period,
	}, nil
}

// GetUserStats retrieves user activity statistics with favorite equipment types
func (s *analyticsService) GetUserStats(ctx context.Context, query types.AnalyticsPeriodQuery) (*types.UserStatsResponse, error) {
	logger.Infof(ctx, "GetUserStats - Year: %v, Month: %v", query.Year, query.Month)

	rawStats, err := s.analyticsRepo.GetUserStats(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch user stats: %v", err)
		return nil, types.NewInternalError("Failed to fetch user stats", err)
	}

	stats := make([]types.UserStatsDTO, 0, len(rawStats))
	for _, raw := range rawStats {
		if raw.UserID == nil {
			continue
		}

		username := ""
		if raw.Username != nil {
			username = *raw.Username
		}

		totalReservations := 0
		if raw.TotalReservations != nil {
			totalReservations = int(*raw.TotalReservations)
		}

		totalCreditsSpent := 0
		if raw.TotalCreditsSpent != nil {
			totalCreditsSpent = int(*raw.TotalCreditsSpent)
		}

		favoriteType, err := s.analyticsRepo.GetFavoriteEquipmentTypeForUser(ctx, *raw.UserID)
		if err != nil {
			logger.Warnf(ctx, "Failed to fetch favorite type for user %s: %v", *raw.UserID, err)
			favoriteType = nil
		}

		dto := types.UserStatsDTO{
			UserID:                *raw.UserID,
			Username:              username,
			TotalReservations:     totalReservations,
			TotalCreditsSpent:     totalCreditsSpent,
			LastReservationDate:   raw.LastReservationDate,
			FavoriteEquipmentType: favoriteType,
		}

		stats = append(stats, dto)
	}

	period := types.PeriodDTO{
		Year:  query.Year,
		Month: query.Month,
	}

	return &types.UserStatsResponse{
		UserStats: stats,
		Period:    period,
	}, nil
}
