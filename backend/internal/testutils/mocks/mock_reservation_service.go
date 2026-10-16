package mocks

import (
	"context"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockReservationService is a mock implementation of reservation.ReservationService.
type MockReservationService struct {
	mock.Mock
}

func (m *MockReservationService) List(ctx context.Context, query types.ReservationListQuery, userID string, role string) (*types.ReservationListResponse, error) {
	args := m.Called(ctx, query, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ReservationListResponse), args.Error(1)
}

func (m *MockReservationService) GetByID(ctx context.Context, id string, userID string, role string) (*types.ReservationDetail, error) {
	args := m.Called(ctx, id, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ReservationDetail), args.Error(1)
}

func (m *MockReservationService) Create(ctx context.Context, cmd types.CreateReservationsCommand, userID string, role string) (*types.CreateReservationsResponse, error) {
	args := m.Called(ctx, cmd, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.CreateReservationsResponse), args.Error(1)
}

func (m *MockReservationService) Update(ctx context.Context, id string, cmd types.UpdateReservationCommand, userID string, role string) (*types.UpdateReservationResponse, error) {
	args := m.Called(ctx, id, cmd, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.UpdateReservationResponse), args.Error(1)
}

func (m *MockReservationService) BulkUpdate(ctx context.Context, cmd types.BulkUpdateReservationsCommand, adminID string) (*types.BulkStatusUpdateResponse, error) {
	args := m.Called(ctx, cmd, adminID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.BulkStatusUpdateResponse), args.Error(1)
}

func (m *MockReservationService) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ReservationDashboardSummary), args.Error(1)
}
