package calendar

import (
	"context"
	"testing"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCalendarRepository is a mock implementation of CalendarRepository
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

func TestGetCalendarAvailability_Success(t *testing.T) {
	t.Run("returns calendar entries for single equipment", func(t *testing.T) {
		mockCalendarRepo := new(MockCalendarRepository)
		service := NewCalendarService(mockCalendarRepo)
		ctx := context.Background()
		equipmentID := "eq-uuid-1"
		startDate := "2025-12-01"
		query := types.CalendarAvailabilityQuery{
			EquipmentID: &equipmentID,
			StartDate:   &startDate,
			Days:        3,
		}
		equipment := []types.PublicEquipmentSelect{
			{ID: "eq-uuid-1", InternalID: "K-01", Name: stringPtr("Red Kayak")},
		}
		reservations := []types.PublicReservationsSelect{
			{
				ID:          "res-1",
				EquipmentID: "eq-uuid-1",
				StartDate:   "2025-12-02",
				EndDate:     "2025-12-02",
				Status:      "PENDING",
			},
		}
		mockCalendarRepo.On("GetEquipmentForCalendar", ctx, &equipmentID).Return(equipment, nil)
		mockCalendarRepo.On("GetReservationsInDateRange", ctx, "2025-12-01", "2025-12-03", &equipmentID).Return(reservations, nil)
		result, err := service.GetCalendarAvailability(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Len(t, result.Calendar, 3)
		assert.Equal(t, "2025-12-01", result.Calendar[0].Date)
		assert.True(t, result.Calendar[0].IsAvailable)
		assert.Equal(t, "2025-12-02", result.Calendar[1].Date)
		assert.False(t, result.Calendar[1].IsAvailable)
		assert.Equal(t, "res-1", *result.Calendar[1].ReservationID)
		assert.Equal(t, "2025-12-03", result.Calendar[2].Date)
		assert.True(t, result.Calendar[2].IsAvailable)
		mockCalendarRepo.AssertExpectations(t)
	})
	t.Run("returns empty calendar when no equipment found", func(t *testing.T) {
		mockCalendarRepo := new(MockCalendarRepository)
		service := NewCalendarService(mockCalendarRepo)
		ctx := context.Background()
		query := types.CalendarAvailabilityQuery{Days: 7}
		mockCalendarRepo.On("GetEquipmentForCalendar", ctx, (*string)(nil)).Return([]types.PublicEquipmentSelect{}, nil)
		result, err := service.GetCalendarAvailability(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Empty(t, result.Calendar)
	})
	t.Run("uses default values when not provided", func(t *testing.T) {
		mockCalendarRepo := new(MockCalendarRepository)
		service := NewCalendarService(mockCalendarRepo)
		ctx := context.Background()
		query := types.CalendarAvailabilityQuery{}
		equipment := []types.PublicEquipmentSelect{
			{ID: "eq-uuid-1", InternalID: "K-01"},
		}
		mockCalendarRepo.On("GetEquipmentForCalendar", ctx, (*string)(nil)).Return(equipment, nil)
		mockCalendarRepo.On("GetReservationsInDateRange", ctx, mock.AnythingOfType("string"), mock.AnythingOfType("string"), (*string)(nil)).Return([]types.PublicReservationsSelect{}, nil)
		result, err := service.GetCalendarAvailability(ctx, query)
		assert.NoError(t, err)
		assert.NotNil(t, result)
		assert.Len(t, result.Calendar, 30)
	})
}
func TestGetCalendarAvailability_InvalidDateFormat(t *testing.T) {
	mockCalendarRepo := new(MockCalendarRepository)
	service := NewCalendarService(mockCalendarRepo)
	ctx := context.Background()
	invalidDate := "invalid-date"
	query := types.CalendarAvailabilityQuery{
		StartDate: &invalidDate,
		Days:      7,
	}
	_, err := service.GetCalendarAvailability(ctx, query)
	assert.Error(t, err)
	assert.IsType(t, &types.ValidationError{}, err)
}
func TestGetCalendarAvailability_MultiDayReservation(t *testing.T) {
	mockCalendarRepo := new(MockCalendarRepository)
	service := NewCalendarService(mockCalendarRepo)
	ctx := context.Background()
	startDate := "2025-12-01"
	query := types.CalendarAvailabilityQuery{
		StartDate: &startDate,
		Days:      5,
	}
	equipment := []types.PublicEquipmentSelect{
		{ID: "eq-uuid-1", InternalID: "K-01", Name: stringPtr("Kayak")},
	}
	reservations := []types.PublicReservationsSelect{
		{
			ID:          "res-1",
			EquipmentID: "eq-uuid-1",
			StartDate:   "2025-12-02",
			EndDate:     "2025-12-04",
			Status:      "RENTED",
		},
	}
	mockCalendarRepo.On("GetEquipmentForCalendar", ctx, (*string)(nil)).Return(equipment, nil)
	mockCalendarRepo.On("GetReservationsInDateRange", ctx, "2025-12-01", "2025-12-05", (*string)(nil)).Return(reservations, nil)
	result, err := service.GetCalendarAvailability(ctx, query)
	assert.NoError(t, err)
	assert.Len(t, result.Calendar, 5)
	assert.True(t, result.Calendar[0].IsAvailable)
	assert.False(t, result.Calendar[1].IsAvailable)
	assert.False(t, result.Calendar[2].IsAvailable)
	assert.False(t, result.Calendar[3].IsAvailable)
	assert.True(t, result.Calendar[4].IsAvailable)
}

func stringPtr(s string) *string {
	return &s
}
