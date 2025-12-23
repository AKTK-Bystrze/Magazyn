package credit

import (
	"context"
	"testing"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
)

func TestGetCreditHistory_Pagination(t *testing.T) {
	// Setup
	mockRepo := new(mocks.MockCreditHistoryRepository)
	mockUserRepo := new(mocks.MockUserRepository)
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
	mockRepo := new(mocks.MockCreditHistoryRepository)
	mockUserRepo := new(mocks.MockUserRepository)
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
