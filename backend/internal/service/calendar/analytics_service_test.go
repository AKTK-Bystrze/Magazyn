package calendar

import (
	"context"
	"testing"

	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
)

func TestGetEquipmentStats_Success(t *testing.T) {
	t.Run("returns equipment stats with top renters", func(t *testing.T) {
		mockAnalyticsRepo := new(mocks.MockAnalyticsRepository)
		service := NewAnalyticsService(mockAnalyticsRepo)
		ctx := context.Background()
		query := types.AnalyticsPeriodQuery{}
		equipmentID := "eq-uuid-1"
		equipmentName := "Red Kayak"
		totalReservations := int64(10)
		totalDaysRented := int64(25)
		utilizationRate := 0.75
		rawStats := []types.PublicAnalyticsEquipmentStatsSelect{
			{
				EquipmentID:       &equipmentID,
				EquipmentName:     &equipmentName,
				TotalReservations: &totalReservations,
				TotalDaysRented:   &totalDaysRented,
				UtilizationRate:   &utilizationRate,
			},
		}
		topRenters := []types.TopRenterDTO{
			{UserID: "user-1", Username: "john", ReservationCount: 5, DaysRented: 12},
		}
		mockAnalyticsRepo.On("GetEquipmentStats", ctx, query).Return(rawStats, nil)
		mockAnalyticsRepo.On("GetTopRentersForEquipment", ctx, equipmentID, 5).Return(topRenters, nil)
		result, err := service.GetEquipmentStats(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Len(t, result.EquipmentStats, 1)
		stat := result.EquipmentStats[0]
		assert.Equal(t, equipmentID, stat.EquipmentID)
		assert.Equal(t, equipmentName, stat.EquipmentName)
		assert.Equal(t, 10, stat.TotalReservations)
		assert.Equal(t, 25, stat.TotalDaysRented)
		assert.Equal(t, 0.75, stat.UtilizationRate)
		assert.Len(t, stat.TopRenters, 1)
		mockAnalyticsRepo.AssertExpectations(t)
	})
	t.Run("returns empty stats when no equipment found", func(t *testing.T) {
		mockAnalyticsRepo := new(mocks.MockAnalyticsRepository)
		service := NewAnalyticsService(mockAnalyticsRepo)
		ctx := context.Background()
		query := types.AnalyticsPeriodQuery{}
		mockAnalyticsRepo.On("GetEquipmentStats", ctx, query).Return([]types.PublicAnalyticsEquipmentStatsSelect{}, nil)
		result, err := service.GetEquipmentStats(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Empty(t, result.EquipmentStats)
	})
	t.Run("includes period in response", func(t *testing.T) {
		mockAnalyticsRepo := new(mocks.MockAnalyticsRepository)
		service := NewAnalyticsService(mockAnalyticsRepo)
		ctx := context.Background()
		year := 2025
		month := 12
		query := types.AnalyticsPeriodQuery{Year: &year, Month: &month}
		mockAnalyticsRepo.On("GetEquipmentStats", ctx, query).Return([]types.PublicAnalyticsEquipmentStatsSelect{}, nil)
		result, err := service.GetEquipmentStats(ctx, query)
		assert.NoError(t, err)
		assert.Equal(t, 2025, *result.Period.Year)
		assert.Equal(t, 12, *result.Period.Month)
	})
}
func TestGetUserStats_Success(t *testing.T) {
	t.Run("returns user stats with favorite equipment type", func(t *testing.T) {
		mockAnalyticsRepo := new(mocks.MockAnalyticsRepository)
		service := NewAnalyticsService(mockAnalyticsRepo)
		ctx := context.Background()
		query := types.AnalyticsPeriodQuery{}
		userID := "user-uuid-1"
		username := "john_doe"
		totalReservations := int64(15)
		totalCreditsSpent := int64(500)
		lastReservationDate := "2025-12-01"
		rawStats := []types.PublicAnalyticsUserStatsSelect{
			{
				UserID:              &userID,
				Username:            &username,
				TotalReservations:   &totalReservations,
				TotalCreditsSpent:   &totalCreditsSpent,
				LastReservationDate: &lastReservationDate,
			},
		}
		favoriteType := "Kayaks"
		mockAnalyticsRepo.On("GetUserStats", ctx, query).Return(rawStats, nil)
		mockAnalyticsRepo.On("GetFavoriteEquipmentTypeForUser", ctx, userID).Return(&favoriteType, nil)
		result, err := service.GetUserStats(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Len(t, result.UserStats, 1)
		stat := result.UserStats[0]
		assert.Equal(t, userID, stat.UserID)
		assert.Equal(t, username, stat.Username)
		assert.Equal(t, 15, stat.TotalReservations)
		assert.Equal(t, 500, stat.TotalCreditsSpent)
		assert.Equal(t, "2025-12-01", *stat.LastReservationDate)
		assert.Equal(t, "Kayaks", *stat.FavoriteEquipmentType)
		mockAnalyticsRepo.AssertExpectations(t)
	})
	t.Run("handles nil favorite equipment type", func(t *testing.T) {
		mockAnalyticsRepo := new(mocks.MockAnalyticsRepository)
		service := NewAnalyticsService(mockAnalyticsRepo)
		ctx := context.Background()
		query := types.AnalyticsPeriodQuery{}
		userID := "user-uuid-1"
		username := "new_user"
		totalReservations := int64(0)
		totalCreditsSpent := int64(0)
		rawStats := []types.PublicAnalyticsUserStatsSelect{
			{
				UserID:            &userID,
				Username:          &username,
				TotalReservations: &totalReservations,
				TotalCreditsSpent: &totalCreditsSpent,
			},
		}
		mockAnalyticsRepo.On("GetUserStats", ctx, query).Return(rawStats, nil)
		mockAnalyticsRepo.On("GetFavoriteEquipmentTypeForUser", ctx, userID).Return((*string)(nil), nil)
		result, err := service.GetUserStats(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Nil(t, result.UserStats[0].FavoriteEquipmentType)
	})
	t.Run("returns empty stats when no users found", func(t *testing.T) {
		mockAnalyticsRepo := new(mocks.MockAnalyticsRepository)
		service := NewAnalyticsService(mockAnalyticsRepo)
		ctx := context.Background()
		query := types.AnalyticsPeriodQuery{}
		mockAnalyticsRepo.On("GetUserStats", ctx, query).Return([]types.PublicAnalyticsUserStatsSelect{}, nil)
		result, err := service.GetUserStats(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Empty(t, result.UserStats)
	})
}
