package reservation_test

import (
	"context"
	"errors"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestList_Success(t *testing.T) {
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()
	query := types.ReservationListQuery{
		Page:    1,
		PerPage: 25,
	}
	items := []types.ReservationListItem{
		{ID: "res-1", UserID: "user-1"},
		{ID: "res-2", UserID: "user-2"},
	}
	total := int64(2)
	mockRepo.On("GetReservations", ctx, query).Return(items, total, nil)
	result, err := svc.List(ctx, query, "", "")
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Reservations, 2)
	assert.Equal(t, 1, result.Pagination.Page)
	assert.Equal(t, 25, result.Pagination.PerPage)
	assert.Equal(t, 2, result.Pagination.TotalItems)
	assert.Equal(t, 1, result.Pagination.TotalPages)
	mockRepo.AssertExpectations(t)
}

func TestList_ScopeFiltering(t *testing.T) {
	scopeAll := "all"
	targetID := "target-user-456"
	userID := "user-123"
	tests := []struct {
		name          string
		query         types.ReservationListQuery
		expectedQuery types.ReservationListQuery
	}{
		{
			name:          "ScopeAll_BypassesRLS",
			query:         types.ReservationListQuery{Page: 1, PerPage: 25, Scope: &scopeAll},
			expectedQuery: types.ReservationListQuery{Page: 1, PerPage: 25, Scope: &scopeAll, BypassRLS: true},
		},
		{
			name:          "ScopeAll_PreservesUserID",
			query:         types.ReservationListQuery{Page: 1, PerPage: 25, Scope: &scopeAll, UserID: &targetID},
			expectedQuery: types.ReservationListQuery{Page: 1, PerPage: 25, Scope: &scopeAll, UserID: &targetID, BypassRLS: true},
		},
		{
			name:          "DefaultScope_RestrictsToUserID",
			query:         types.ReservationListQuery{Page: 1, PerPage: 25},
			expectedQuery: types.ReservationListQuery{Page: 1, PerPage: 25, UserID: &userID},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo, _, _, _, svc := setupTestService()
			ctx := context.Background()
			mockRepo.On("GetReservations", ctx, tt.expectedQuery).Return([]types.ReservationListItem{}, int64(0), nil)
			result, err := svc.List(ctx, tt.query, userID, auth.RoleUser)
			assert.NoError(t, err)
			assert.NotNil(t, result)
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestList_PaginationCalculation(t *testing.T) {
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()
	query := types.ReservationListQuery{
		Page:    1,
		PerPage: 10,
	}
	items := []types.ReservationListItem{}
	total := int64(47)
	mockRepo.On("GetReservations", ctx, query).Return(items, total, nil)
	result, err := svc.List(ctx, query, "", "")
	assert.NoError(t, err)
	assert.Equal(t, 5, result.Pagination.TotalPages)
	mockRepo.AssertExpectations(t)
}

func TestList_DatabaseErrors(t *testing.T) {
	tests := []struct {
		name     string
		dbErr    error
		errCheck func(t *testing.T, err error)
	}{
		{
			name:  "EnumError_ReturnsValidationError",
			dbErr: errors.New("(22P02) invalid input value for enum reservation_status: \"FOOBAR\""),
			errCheck: func(t *testing.T, err error) {
				valErr, ok := err.(*types.ValidationError)
				assert.True(t, ok, "Expected *types.ValidationError but got %T", err)
				assert.Equal(t, "VALIDATION_ERROR", valErr.Code)
			},
		},
		{
			name:  "InternalError_ReturnsInternalError",
			dbErr: errors.New("connection refused"),
			errCheck: func(t *testing.T, err error) {
				intErr, ok := err.(*types.InternalError)
				assert.True(t, ok, "Expected *types.InternalError but got %T", err)
				assert.Equal(t, "INTERNAL_ERROR", intErr.Code)
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo, _, _, _, svc := setupTestService()
			ctx := context.Background()
			query := types.ReservationListQuery{Page: 1, PerPage: 10}
			mockRepo.On("GetReservations", ctx, query).Return(nil, int64(0), tt.dbErr)
			result, err := svc.List(ctx, query, "", "")
			assert.Nil(t, result)
			require.Error(t, err)
			tt.errCheck(t, err)
			mockRepo.AssertExpectations(t)
		})
	}
}
