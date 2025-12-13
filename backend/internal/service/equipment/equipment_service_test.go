package equipment

import (
	"context"
	"testing"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockEquipmentRepository is a mock implementation of EquipmentRepository
type MockEquipmentRepository struct {
	mock.Mock
}

func (m *MockEquipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error) {
	args := m.Called(ctx, query)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
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
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockEquipmentRepository) Update(ctx context.Context, id string, equipment types.PublicEquipmentUpdate) (*types.PublicEquipmentSelect, error) {
	args := m.Called(ctx, id, equipment)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockEquipmentRepository) Archive(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockEquipmentRepository) GetTypeForEquipment(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error) {
	return m.GetTypeByID(ctx, typeID)
}

func (m *MockEquipmentRepository) GetMaintenanceLogs(ctx context.Context, equipmentID string) ([]types.PublicMaintenanceLogsSelect, error) {
	args := m.Called(ctx, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicMaintenanceLogsSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetMaintenanceLogsWithAdmin(ctx context.Context, equipmentID string) ([]repository.MaintenanceLogWithAdmin, error) {
	args := m.Called(ctx, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.MaintenanceLogWithAdmin), args.Error(1)
}

func (m *MockEquipmentRepository) GetActiveReservations(ctx context.Context, equipmentID string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetConflictingReservations(ctx context.Context, equipmentID string, start string, end string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, equipmentID, start, end)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetUserFavorites(ctx context.Context, userID string) (map[string]bool, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]bool), args.Error(1)
}

// MockEquipmentTypeRepository is a mock implementation of EquipmentTypeRepository
type MockEquipmentTypeRepository struct {
	mock.Mock
}

func (m *MockEquipmentTypeRepository) ListAll(ctx context.Context) ([]types.PublicEquipmentTypesSelect, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicEquipmentTypesSelect), args.Error(1)
}

func (m *MockEquipmentTypeRepository) Create(ctx context.Context, et types.PublicEquipmentTypesInsert) (*types.PublicEquipmentTypesSelect, error) {
	args := m.Called(ctx, et)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentTypesSelect), args.Error(1)
}

func (m *MockEquipmentTypeRepository) GetTypesByIDs(ctx context.Context, ids []string) (map[string]types.PublicEquipmentTypesSelect, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]types.PublicEquipmentTypesSelect), args.Error(1)
}

// Tests

func TestCreateEquipment_Success(t *testing.T) {
	mockRepo := new(MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, "http://localhost:54321")
	ctx := context.Background()

	cmd := types.CreateEquipmentCommand{
		InternalID: "K-01",
		TypeID:     "type-uuid",
		Name:       stringPtr("Kayak"),
	}

	mockRepo.On("GetTypeByID", ctx, "type-uuid").Return(&types.PublicEquipmentTypesSelect{
		Name:             "Water Equipment",
		CreditCostPerDay: 100,
	}, nil)

	mockRepo.On("GetInternalIDCheck", ctx, "type-uuid", "K-01").Return(false, nil)

	mockRepo.On("Create", ctx, mock.AnythingOfType("types.PublicEquipmentInsert")).Return(&types.PublicEquipmentSelect{
		ID:         "eq-uuid",
		InternalID: "K-01",
		TypeID:     "type-uuid",
		Name:       stringPtr("Kayak"),
		Status:     constants.EquipmentStatusOK,
	}, nil)

	result, err := service.Create(ctx, cmd, "admin-id")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Kayak", *result.Name)
	assert.Equal(t, int32(100), result.CreditCostPerDay)
	mockRepo.AssertExpectations(t)
	mockTypeRepo.AssertExpectations(t)
}

func TestCreateEquipment_DuplicateInternalID(t *testing.T) {
	mockRepo := new(MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, "http://localhost:54321")
	ctx := context.Background()

	cmd := types.CreateEquipmentCommand{
		InternalID: "K-01",
		TypeID:     "type-uuid",
	}

	mockRepo.On("GetTypeByID", ctx, "type-uuid").Return(&types.PublicEquipmentTypesSelect{}, nil)
	mockRepo.On("GetInternalIDCheck", ctx, "type-uuid", "K-01").Return(true, nil)

	_, err := service.Create(ctx, cmd, "admin-id")

	assert.Error(t, err)
	assert.IsType(t, &types.ConflictError{}, err)
	mockRepo.AssertExpectations(t)
}

func TestArchiveEquipment_Success(t *testing.T) {
	mockRepo := new(MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, "http://localhost:54321")
	ctx := context.Background()
	id := "eq-uuid"

	mockRepo.On("GetByID", ctx, id).Return(&types.PublicEquipmentSelect{ID: id, IsArchived: false}, nil)
	mockRepo.On("GetActiveReservations", ctx, id).Return([]types.PublicReservationsSelect{}, nil)
	mockRepo.On("Archive", ctx, id).Return(nil)

	err := service.Archive(ctx, id)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestArchiveEquipment_ActiveReservations(t *testing.T) {
	mockRepo := new(MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, "http://localhost:54321")
	ctx := context.Background()
	id := "eq-uuid"

	mockRepo.On("GetByID", ctx, id).Return(&types.PublicEquipmentSelect{ID: id, IsArchived: false}, nil)
	mockRepo.On("GetActiveReservations", ctx, id).Return([]types.PublicReservationsSelect{{ID: "res-1"}}, nil)

	err := service.Archive(ctx, id)

	assert.Error(t, err)
	assert.IsType(t, &types.ConflictError{}, err)
	mockRepo.AssertNotCalled(t, "Archive", ctx, id) // Should not call archive
}

func TestCheckAvailability_Available(t *testing.T) {
	mockRepo := new(MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, "http://localhost:54321")
	ctx := context.Background()
	id := "eq-uuid"
	query := types.AvailabilityQuery{StartDate: "2023-01-01", EndDate: "2023-01-05"}

	mockRepo.On("GetByID", ctx, id).Return(&types.PublicEquipmentSelect{ID: id}, nil)
	mockRepo.On("GetConflictingReservations", ctx, id, "2023-01-01", "2023-01-05").Return([]types.PublicReservationsSelect{}, nil)

	result, err := service.CheckAvailability(ctx, id, query)

	assert.NoError(t, err)
	assert.True(t, result.IsAvailable)
	assert.Empty(t, result.ConflictingReservations)
}

// Helper
func stringPtr(s string) *string {
	return &s
}
