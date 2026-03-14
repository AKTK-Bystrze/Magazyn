package mocks

import (
	"context"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockReservationRepository implements repository.ReservationRepository
type MockReservationRepository struct {
	mock.Mock
}

// Ensure mock implements interface
var _ repository.ReservationRepository = (*MockReservationRepository)(nil)

func (m *MockReservationRepository) GetReservations(ctx context.Context, query types.ReservationListQuery) ([]types.ReservationListItem, int64, error) {
	args := m.Called(ctx, query)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]types.ReservationListItem), args.Get(1).(int64), args.Error(2)
}

func (m *MockReservationRepository) GetReservationByID(ctx context.Context, id string) (*types.ReservationDetail, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ReservationDetail), args.Error(1)
}

func (m *MockReservationRepository) CreateReservation(ctx context.Context, reservation types.PublicReservationsInsert) (*types.PublicReservationsSelect, error) {
	args := m.Called(ctx, reservation)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicReservationsSelect), args.Error(1)
}

func (m *MockReservationRepository) CreateReservationsAtomic(ctx context.Context, userID string, totalCost int32, isFree bool, reservations []types.CreateReservationItem) ([]string, int32, error) {
	args := m.Called(ctx, userID, totalCost, isFree, reservations)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int32), args.Error(2)
	}
	return args.Get(0).([]string), args.Get(1).(int32), args.Error(2)
}

func (m *MockReservationRepository) UpdateReservation(ctx context.Context, id string, reservation types.PublicReservationsUpdate, changedByUserID string) (*types.PublicReservationsSelect, error) {
	args := m.Called(ctx, id, reservation, changedByUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicReservationsSelect), args.Error(1)
}

func (m *MockReservationRepository) BulkUpdateReservations(ctx context.Context, ids []string, status string) error {
	args := m.Called(ctx, ids, status)
	return args.Error(0)
}

func (m *MockReservationRepository) BulkUpdateStatusAtomic(ctx context.Context, ids []string, status string, adminID string) (*types.BulkStatusUpdateResponse, error) {
	args := m.Called(ctx, ids, status, adminID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.BulkStatusUpdateResponse), args.Error(1)
}

func (m *MockReservationRepository) GetOverlappingReservations(ctx context.Context, equipmentID string, startDate string, endDate string, excludeReservationID *string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, equipmentID, startDate, endDate, excludeReservationID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockReservationRepository) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ReservationDashboardSummary), args.Error(1)
}

func (m *MockReservationRepository) GetReservationsInRange(ctx context.Context, rangeStart string, rangeEnd string, equipmentID *string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, rangeStart, rangeEnd, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockReservationRepository) RefundCredits(ctx context.Context, reservationID string, amount int32) error {
	args := m.Called(ctx, reservationID, amount)
	return args.Error(0)
}

func (m *MockReservationRepository) ModifyReservationDatesWithCredits(ctx context.Context, reservationID string, changedByUserID string, newStartDate string, newEndDate string) (*types.ModifyDatesResponse, error) {
	args := m.Called(ctx, reservationID, changedByUserID, newStartDate, newEndDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ModifyDatesResponse), args.Error(1)
}
