package reservation_test

import (
	"context"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/types"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// ============================================================================
// Mocks
// ============================================================================

type MockReservationRepository struct {
	mock.Mock
}

func (m *MockReservationRepository) GetReservations(ctx context.Context, query types.ReservationListQuery) ([]types.ReservationListItem, int64, error) {
	args := m.Called(ctx, query)
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

func (m *MockReservationRepository) CreateReservationsAtomic(ctx context.Context, userID string, totalCost int32, reservations []types.CreateReservationItem) ([]string, int32, error) {
	args := m.Called(ctx, userID, totalCost, reservations)
	return args.Get(0).([]string), args.Get(1).(int32), args.Error(2)
}

func (m *MockReservationRepository) UpdateReservation(ctx context.Context, id string, reservation types.PublicReservationsUpdate) (*types.PublicReservationsSelect, error) {
	args := m.Called(ctx, id, reservation)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicReservationsSelect), args.Error(1)
}

func (m *MockReservationRepository) BulkUpdateReservations(ctx context.Context, ids []string, status string) error {
	args := m.Called(ctx, ids, status)
	return args.Error(0)
}

func (m *MockReservationRepository) GetOverlappingReservations(ctx context.Context, equipmentID string, startDate string, endDate string, excludeReservationID *string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, equipmentID, startDate, endDate, excludeReservationID)
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
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockReservationRepository) RefundCredits(ctx context.Context, reservationID string, amount int32) error {
	args := m.Called(ctx, reservationID, amount)
	return args.Error(0)
}

type MockEquipmentRepository struct {
	mock.Mock
}

func (m *MockEquipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error) {
	args := m.Called(ctx, query)
	return args.Get(0).([]types.PublicEquipmentSelect), args.Get(1).(int64), args.Error(2)
}

func (m *MockEquipmentRepository) GetByID(ctx context.Context, id string) (*types.PublicEquipmentSelect, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetTypeByID(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error) {
	args := m.Called(ctx, typeID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentTypesSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetInternalIDCheck(ctx context.Context, typeID string, internalID string) (bool, error) {
	args := m.Called(ctx, typeID, internalID)
	return args.Bool(0), args.Error(1)
}

func (m *MockEquipmentRepository) Create(ctx context.Context, equipment types.PublicEquipmentInsert) (*types.PublicEquipmentSelect, error) {
	args := m.Called(ctx, equipment)
	return args.Get(0).(*types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockEquipmentRepository) Update(ctx context.Context, id string, equipment types.PublicEquipmentUpdate) (*types.PublicEquipmentSelect, error) {
	args := m.Called(ctx, id, equipment)
	return args.Get(0).(*types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockEquipmentRepository) Archive(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockEquipmentRepository) GetTypeForEquipment(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error) {
	args := m.Called(ctx, typeID)
	return args.Get(0).(*types.PublicEquipmentTypesSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetMaintenanceLogs(ctx context.Context, equipmentID string) ([]types.PublicMaintenanceLogsSelect, error) {
	args := m.Called(ctx, equipmentID)
	return args.Get(0).([]types.PublicMaintenanceLogsSelect), args.Error(1)
}

// We need to import repository package to use MaintenanceLogWithAdmin or define alias. 
// Since we are in reservation_test, we can import repository.
// Wait, circular dependency if we import repository? No, repository imports types.
// We are in reservation_test package, so we can import repository.
func (m *MockEquipmentRepository) GetMaintenanceLogsWithAdmin(ctx context.Context, equipmentID string) ([]repository.MaintenanceLogWithAdmin, error) {
	args := m.Called(ctx, equipmentID)
	return args.Get(0).([]repository.MaintenanceLogWithAdmin), args.Error(1)
}

func (m *MockEquipmentRepository) GetActiveReservations(ctx context.Context, equipmentID string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, equipmentID)
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetConflictingReservations(ctx context.Context, equipmentID string, start string, end string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, equipmentID, start, end)
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetUserFavorites(ctx context.Context, userID string) (map[string]bool, error) {
	args := m.Called(ctx, userID)
	return args.Get(0).(map[string]bool), args.Error(1)
}

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) List(ctx context.Context, page, perPage int, role, search string) ([]types.PublicProfilesSelect, int64, error) {
	args := m.Called(ctx, page, perPage, role, search)
	return args.Get(0).([]types.PublicProfilesSelect), args.Get(1).(int64), args.Error(2)
}

func (m *MockUserRepository) GetByID(ctx context.Context, id string) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

func (m *MockUserRepository) Create(ctx context.Context, profile types.PublicProfilesInsert) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, profile)
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, id string, profile types.PublicProfilesUpdate) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, id, profile)
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

type MockEmailService struct {
	mock.Mock
}

func (m *MockEmailService) SendReservationConfirmation(ctx context.Context, email string, details map[string]interface{}) error {
	args := m.Called(ctx, email, details)
	return args.Error(0)
}

// ============================================================================
// Tests
// ============================================================================

func TestReservationService_Create_Success(t *testing.T) {
	mockRepo := new(MockReservationRepository)
	mockEqRepo := new(MockEquipmentRepository)
	mockUserRepo := new(MockUserRepository)
	mockEmail := new(MockEmailService)

	svc := reservation.NewReservationService(mockRepo, mockEqRepo, mockUserRepo, mockEmail)
	ctx := context.Background()

	userID := "user-123"
	equipID := "equip-1"
	typeID := "type-1"

	// Mock Equipment Retrieval
	mockEqRepo.On("GetByID", ctx, equipID).Return(&types.PublicEquipmentSelect{
		Id:     equipID,
		TypeId: typeID,
		Status: constants.EquipmentStatusOK,
		Name:   stringPtr("Camera"),
	}, nil)

	mockEqRepo.On("GetTypeByID", ctx, typeID).Return(&types.PublicEquipmentTypesSelect{
		Id:               typeID,
		CreditCostPerDay: 10,
	}, nil)

	// Mock Creation Atomic
	expectedCost := int32(20)
	t.Logf("Setting up CreateReservationsAtomic mock with cost: %d", expectedCost)
	mockRepo.On("CreateReservationsAtomic", mock.Anything, userID, expectedCost, mock.Anything).
		Return([]string{"res-1"}, int32(990), nil)

	// Mock User Retrieval for Email
	mockUserRepo.On("GetByID", mock.Anything, userID).Return(&types.PublicProfilesSelect{
		Email: "test@example.com",
	}, nil)

	// Mock Email
	mockEmail.On("SendReservationConfirmation", mock.Anything, "test@example.com", mock.Anything).Return(nil)

	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{EquipmentID: equipID, StartDate: "2025-01-01", EndDate: "2025-01-01"},
		},
	}

	resp, err := svc.Create(ctx, cmd, userID)
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, int32(20), resp.TotalCreditCost)
	assert.Len(t, resp.Reservations, 1)
}

func TestReservationService_Update_RefundTrigger(t *testing.T) {
	mockRepo := new(MockReservationRepository)
	mockEqRepo := new(MockEquipmentRepository)
	mockUserRepo := new(MockUserRepository)
	mockEmail := new(MockEmailService)

	svc := reservation.NewReservationService(mockRepo, mockEqRepo, mockUserRepo, mockEmail)
	ctx := context.Background()

	resID := "res-1"
	userID := "user-123"
	equipID := "equip-1"
	typeID := "type-1"

	// Existing reservation
	mockRepo.On("GetReservationByID", ctx, resID).Return(&types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:          resID,
			UserID:      userID,
			EquipmentID: equipID,
			StartDate:   "2025-01-01",
			EndDate:     "2025-01-01",
			Status:      constants.ReservationStatusPending,
		},
	}, nil)

	// Mock Equipment for refund calc
	mockEqRepo.On("GetByID", ctx, equipID).Return(&types.PublicEquipmentSelect{
		Id:     equipID,
		TypeId: typeID,
	}, nil)
	mockEqRepo.On("GetTypeByID", ctx, typeID).Return(&types.PublicEquipmentTypesSelect{
		CreditCostPerDay: 10,
	}, nil)

	// Mock Refund Call
	mockRepo.On("RefundCredits", ctx, resID, int32(20)).Return(nil)

	// Mock Update Call
	mockRepo.On("UpdateReservation", ctx, resID, mock.AnythingOfType("types.PublicReservationsUpdate")).
		Return(&types.PublicReservationsSelect{
			Id:     resID,
			Status: constants.ReservationStatusDenied,
		}, nil)

	cmd := types.UpdateReservationCommand{
		Status: stringPtr(constants.ReservationStatusDenied),
	}

	// Acting as Admin to allow status change to DENIED if not owner? 
	// Or user cancelling self.
	// User can cancel own pending.
	resp, err := svc.Update(ctx, resID, cmd, userID, auth.RoleUser)
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, constants.ReservationStatusDenied, resp.Status)

	mockRepo.AssertExpectations(t)
}

func stringPtr(s string) *string {
	return &s
}
