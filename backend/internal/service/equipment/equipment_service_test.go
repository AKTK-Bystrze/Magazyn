package equipment

import (
	"context"
	"testing"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/testutils"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

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
func (m *MockEquipmentTypeRepository) GetTypesByIDs(ctx context.Context, ids []string) (map[string]types.PublicEquipmentTypesSelect, error) {
	args := m.Called(ctx, ids)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]types.PublicEquipmentTypesSelect), args.Error(1)
}

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) List(ctx context.Context, page, perPage int, role, search string) ([]types.PublicProfilesSelect, int64, error) {
	args := m.Called(ctx, page, perPage, role, search)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
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
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}
func (m *MockUserRepository) Update(ctx context.Context, id string, profile types.PublicProfilesUpdate) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, id, profile)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}
func (m *MockUserRepository) BulkAdjustCreditsAtomic(ctx context.Context, userIDs []string, adminID string, amount int32, reason string, description string) error {
	args := m.Called(ctx, userIDs, adminID, amount, reason, description)
	return args.Error(0)
}

func TestCreateEquipment_Success(t *testing.T) {
	mockRepo := new(mocks.MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	mockUserRepo := new(MockUserRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, mockUserRepo, "http://localhost:54321")
	ctx := context.Background()
	cmd := types.CreateEquipmentCommand{
		InternalID: "K-01",
		TypeID:     "type-uuid",
		Name:       testutils.StringPtr("Kayak"),
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
		Name:       testutils.StringPtr("Kayak"),
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
	mockRepo := new(mocks.MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	mockUserRepo := new(MockUserRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, mockUserRepo, "http://localhost:54321")
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
	mockRepo := new(mocks.MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	mockUserRepo := new(MockUserRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, mockUserRepo, "http://localhost:54321")
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
	mockRepo := new(mocks.MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	mockUserRepo := new(MockUserRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, mockUserRepo, "http://localhost:54321")
	ctx := context.Background()
	id := "eq-uuid"
	mockRepo.On("GetByID", ctx, id).Return(&types.PublicEquipmentSelect{ID: id, IsArchived: false}, nil)
	mockRepo.On("GetActiveReservations", ctx, id).Return([]types.PublicReservationsSelect{{ID: "res-1"}}, nil)
	err := service.Archive(ctx, id)
	assert.Error(t, err)
	assert.IsType(t, &types.ConflictError{}, err)
	mockRepo.AssertNotCalled(t, "Archive", ctx, id)
}
func TestCheckAvailability_Available(t *testing.T) {
	mockRepo := new(mocks.MockEquipmentRepository)
	mockTypeRepo := new(MockEquipmentTypeRepository)
	mockUserRepo := new(MockUserRepository)
	service := NewEquipmentService(mockRepo, mockTypeRepo, mockUserRepo, "http://localhost:54321")
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
