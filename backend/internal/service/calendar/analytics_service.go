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
	// GetEquipmentStats retrieves aggregated equipment usage statistics
	GetEquipmentStats(ctx context.Context, query types.AnalyticsPeriodQuery) (*types.EquipmentStatsResponse, error)

	// GetUserStats retrieves aggregated user activity statistics
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

	// Fetch raw stats from analytics view
	rawStats, err := s.analyticsRepo.GetEquipmentStats(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch equipment stats: %v", err)
		return nil, types.NewInternalError("Failed to fetch equipment stats", err)
	}

	// TODO: The analytics view doesn't include equipment type_id.
	// To populate EquipmentType, either update the view or make additional queries.
	// For now, typeRepo is kept for future enhancement but not used.

	// Transform to DTOs with top renters
	stats := make([]types.EquipmentStatsDTO, 0, len(rawStats))
	for _, raw := range rawStats {
		if raw.EquipmentId == nil {
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

		// Fetch top renters for this equipment
		topRenters, err := s.analyticsRepo.GetTopRentersForEquipment(ctx, *raw.EquipmentId, constants.TopRentersLimit)
		if err != nil {
			logger.Warnf(ctx, "Failed to fetch top renters for equipment %s: %v", *raw.EquipmentId, err)
			topRenters = []types.TopRenterDTO{}
		}

		dto := types.EquipmentStatsDTO{
			EquipmentID:       *raw.EquipmentId,
			EquipmentName:     equipmentName,
			EquipmentType:     "", // Will be populated if we have type info
			TotalReservations: totalReservations,
			TotalDaysRented:   totalDaysRented,
			UtilizationRate:   utilizationRate,
			TopRenters:        topRenters,
		}

		stats = append(stats, dto)
	}

	// Build period response
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

	// Fetch raw stats from analytics view
	rawStats, err := s.analyticsRepo.GetUserStats(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch user stats: %v", err)
		return nil, types.NewInternalError("Failed to fetch user stats", err)
	}

	// Transform to DTOs with favorite equipment type
	stats := make([]types.UserStatsDTO, 0, len(rawStats))
	for _, raw := range rawStats {
		if raw.UserId == nil {
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

		// Fetch favorite equipment type for this user
		favoriteType, err := s.analyticsRepo.GetFavoriteEquipmentTypeForUser(ctx, *raw.UserId)
		if err != nil {
			logger.Warnf(ctx, "Failed to fetch favorite type for user %s: %v", *raw.UserId, err)
			favoriteType = nil
		}

		dto := types.UserStatsDTO{
			UserID:                *raw.UserId,
			Username:              username,
			TotalReservations:     totalReservations,
			TotalCreditsSpent:     totalCreditsSpent,
			LastReservationDate:   raw.LastReservationDate,
			FavoriteEquipmentType: favoriteType,
		}

		stats = append(stats, dto)
	}

	// Build period response
	period := types.PeriodDTO{
		Year:  query.Year,
		Month: query.Month,
	}

	return &types.UserStatsResponse{
		UserStats: stats,
		Period:    period,
	}, nil
}
