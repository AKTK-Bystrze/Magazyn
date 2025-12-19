package credit

import (
	"context"
	"testing"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCreditHistoryRepository mocks repository.CreditHistoryRepository
type MockCreditHistoryRepository struct {
	mock.Mock
}

func (m *MockCreditHistoryRepository) GetCreditHistory(ctx context.Context, userID *string, page, perPage int) ([]types.CreditHistoryItemDTO, int64, error) {
	args := m.Called(ctx, userID, page, perPage)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]types.CreditHistoryItemDTO), args.Get(1).(int64), args.Error(2)
}

func (m *MockCreditHistoryRepository) Create(ctx context.Context, item types.PublicCreditHistoryInsert) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}

// MockUserRepository mocks repository.UserRepository
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

func TestGetCreditHistory_Pagination(t *testing.T) {
	// Setup
	mockRepo := new(MockCreditHistoryRepository)
	mockUserRepo := new(MockUserRepository)
	service := NewCreditHistoryService(mockRepo, mockUserRepo)
	ctx := context.Background()

	// Test Case 1: Invalid PerPage (not in allowed constants)
	query := types.GetCreditHistoryQuery{
		Page:    1,
		PerPage: 15, // Invalid
	}
	_, err := service.GetCreditHistory(ctx, query, "user1")
	assert.Error(t, err)
	assert.IsType(t, &types.ValidationError{}, err)
	assert.Contains(t, err.Error(), "Invalid per_page value")

	// Test Case 2: Valid PerPage
	queryValid := types.GetCreditHistoryQuery{
		Page:    1,
		PerPage: 25,
	}

	// Mocks
	userID := "user1"
	mockRepo.On("GetCreditHistory", ctx, &userID, 1, 25).Return([]types.CreditHistoryItemDTO{}, int64(0), nil)
	mockUserRepo.On("GetByID", ctx, userID).Return(&types.PublicProfilesSelect{CreditBalance: 100}, nil)

	resp, err := service.GetCreditHistory(ctx, queryValid, userID)
	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, int32(100), resp.CurrentBalance)

	mockRepo.AssertExpectations(t)
	mockUserRepo.AssertExpectations(t)
}

func TestGetCreditHistory_PaginationDefaults(t *testing.T) {
	mockRepo := new(MockCreditHistoryRepository)
	mockUserRepo := new(MockUserRepository)
	service := NewCreditHistoryService(mockRepo, mockUserRepo)
	ctx := context.Background()

	query := types.GetCreditHistoryQuery{
		Page:    0, // Should default to 1
		PerPage: 0, // Should default to 25
	}
	userID := "user1"

	// Expect call with defaults
	mockRepo.On("GetCreditHistory", ctx, &userID, constants.DefaultPage, constants.DefaultPerPage).Return([]types.CreditHistoryItemDTO{}, int64(0), nil)
	mockUserRepo.On("GetByID", ctx, userID).Return(&types.PublicProfilesSelect{CreditBalance: 100}, nil)

	_, err := service.GetCreditHistory(ctx, query, userID)
	assert.NoError(t, err)

	mockRepo.AssertExpectations(t)
}
