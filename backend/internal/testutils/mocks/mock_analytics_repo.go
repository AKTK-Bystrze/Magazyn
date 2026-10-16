package mocks

import (
	"context"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockAnalyticsRepository is a mock implementation of AnalyticsRepository.
type MockAnalyticsRepository struct {
	mock.Mock
}

func (m *MockAnalyticsRepository) GetEquipmentStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsEquipmentStatsSelect, error) {
	args := m.Called(ctx, query)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicAnalyticsEquipmentStatsSelect), args.Error(1)
}

func (m *MockAnalyticsRepository) GetUserStats(ctx context.Context, query types.AnalyticsPeriodQuery) ([]types.PublicAnalyticsUserStatsSelect, error) {
	args := m.Called(ctx, query)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicAnalyticsUserStatsSelect), args.Error(1)
}

func (m *MockAnalyticsRepository) GetTopRentersForEquipment(ctx context.Context, equipmentID string, limit int) ([]types.TopRenterDTO, error) {
	args := m.Called(ctx, equipmentID, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.TopRenterDTO), args.Error(1)
}

func (m *MockAnalyticsRepository) GetFavoriteEquipmentTypeForUser(ctx context.Context, userID string) (*string, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*string), args.Error(1)
}

var _ repository.AnalyticsRepository = (*MockAnalyticsRepository)(nil)
