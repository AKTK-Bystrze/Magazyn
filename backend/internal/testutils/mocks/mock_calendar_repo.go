package mocks

import (
	"context"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockCalendarRepository is a mock implementation of CalendarRepository.
type MockCalendarRepository struct {
	mock.Mock
}

func (m *MockCalendarRepository) GetEquipmentForCalendar(ctx context.Context, equipmentID *string) ([]types.PublicEquipmentSelect, error) {
	args := m.Called(ctx, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockCalendarRepository) GetReservationsInDateRange(ctx context.Context, startDate string, endDate string, equipmentID *string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, startDate, endDate, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

var _ repository.CalendarRepository = (*MockCalendarRepository)(nil)
