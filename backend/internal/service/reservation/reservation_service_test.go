package reservation_test

import (
	"context"
	"errors"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func setupTestService() (*mocks.MockReservationRepository, *mocks.MockEquipmentRepository, *mocks.MockUserRepository, *mocks.MockEmailService, reservation.ReservationService) {
	mockRepo := new(mocks.MockReservationRepository)
	mockEquipRepo := new(mocks.MockEquipmentRepository)
	mockUserRepo := new(mocks.MockUserRepository)
	mockEmailService := new(mocks.MockEmailService)
	svc := reservation.NewReservationService(mockRepo, mockEquipRepo, mockUserRepo, mockEmailService)
	return mockRepo, mockEquipRepo, mockUserRepo, mockEmailService, svc
}

func TestGetByID(t *testing.T) {
	tests := []struct {
		name        string
		requestUser string
		role        string
		wantErr     bool
	}{
		{"OwnerCanView", "user-123", auth.RoleUser, false},
		{"NonOwnerForbidden", "user-999", auth.RoleUser, true},
		{"AdminCanViewAny", "admin-999", auth.RoleAdmin, false},
		{"SuperAdminCanViewAny", "superadmin-999", auth.RoleSuperAdmin, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo, _, _, _, svc := setupTestService()
			ctx := context.Background()
			reservationID := "res-456"
			reservation := &types.ReservationDetail{
				ReservationListItem: types.ReservationListItem{
					ID:     reservationID,
					UserID: "user-123",
					Status: constants.ReservationStatusPending,
				},
			}
			mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)
			result, err := svc.GetByID(ctx, reservationID, tt.requestUser, tt.role)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Nil(t, result)
				assert.IsType(t, &types.ForbiddenError{}, err)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)
				assert.Equal(t, reservationID, result.ID)
			}
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestUpdate_UserRestrictions(t *testing.T) {
	rentedStatus := constants.ReservationStatusRented
	tests := []struct {
		name       string
		reqUser    string
		initStatus string
		cmd        types.UpdateReservationCommand
		errCheck   func(t *testing.T, err error)
	}{
		{
			name:       "CannotUpdateOthers",
			reqUser:    "user-999",
			initStatus: constants.ReservationStatusPending,
			cmd:        types.UpdateReservationCommand{},
			errCheck: func(t *testing.T, err error) {
				assert.IsType(t, &types.ForbiddenError{}, err)
				assert.Contains(t, err.Error(), "Not allowed")
			},
		},
		{
			name:       "CannotModifyNonPending",
			reqUser:    "user-123",
			initStatus: constants.ReservationStatusRented,
			cmd:        types.UpdateReservationCommand{},
			errCheck: func(t *testing.T, err error) {
				assert.IsType(t, &types.ForbiddenError{}, err)
				assert.Contains(t, err.Error(), "Cannot modify non-pending reservation")
			},
		},
		{
			name:       "CanOnlyCancelOrReturn",
			reqUser:    "user-123",
			initStatus: constants.ReservationStatusPending,
			cmd:        types.UpdateReservationCommand{Status: &rentedStatus},
			errCheck: func(t *testing.T, err error) {
				assert.IsType(t, &types.ValidationError{}, err)
				assert.Contains(t, err.Error(), "Users can only cancel or return")
			},
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo, _, _, _, svc := setupTestService()
			ctx := context.Background()
			reservationID := "res-456"
			reservation := &types.ReservationDetail{
				ReservationListItem: types.ReservationListItem{
					ID:          reservationID,
					UserID:      "user-123",
					Status:      tt.initStatus,
					EquipmentID: "eq-1",
					StartDate:   "2025-01-01",
					EndDate:     "2025-01-03",
				},
			}
			mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)
			result, err := svc.Update(ctx, reservationID, tt.cmd, tt.reqUser, auth.RoleUser)
			assert.Error(t, err)
			assert.Nil(t, result)
			tt.errCheck(t, err)
			mockRepo.AssertExpectations(t)
		})
	}
}

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

func TestCreate_EquipmentUnavailable(t *testing.T) {
	name := "Equipment"
	tests := []struct {
		name       string
		eqID       string
		equipMock  *types.PublicEquipmentSelect
		equipErr   error
		errContain string
	}{
		{
			name:       "NotFound",
			eqID:       "nonexistent-eq",
			equipMock:  nil,
			equipErr:   types.NewNotFoundError("Equipment", "nonexistent-eq"),
			errContain: "not found",
		},
		{
			name:       "Archived",
			eqID:       "eq-archived",
			equipMock:  &types.PublicEquipmentSelect{ID: "eq-archived", Name: &name, TypeID: "type-1", Status: constants.EquipmentStatusOK, IsArchived: true},
			equipErr:   nil,
			errContain: "not available",
		},
		{
			name:       "Broken",
			eqID:       "eq-broken",
			equipMock:  &types.PublicEquipmentSelect{ID: "eq-broken", Name: &name, TypeID: "type-1", Status: constants.EquipmentStatusBroken, IsArchived: false},
			equipErr:   nil,
			errContain: "not available",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, mockEquipRepo, _, _, svc := setupTestService()
			ctx := context.Background()
			cmd := types.CreateReservationsCommand{
				Reservations: []types.CreateReservationItem{
					{EquipmentID: tt.eqID, StartDate: "2025-01-01", EndDate: "2025-01-03"},
				},
			}
			mockEquipRepo.On("GetByID", ctx, tt.eqID).Return(tt.equipMock, tt.equipErr)
			result, err := svc.Create(ctx, cmd, "user-123", "user")
			assert.Error(t, err)
			assert.Nil(t, result)
			assert.IsType(t, &types.ValidationError{}, err)
			assert.Contains(t, err.Error(), tt.errContain)
			mockEquipRepo.AssertExpectations(t)
		})
	}
}

func TestCreate_FreeReservation_ForbiddenForUser(t *testing.T) {
	_, _, _, _, svc := setupTestService()
	ctx := context.Background()
	isFree := true
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: "eq-1",
				StartDate:   "2025-01-01",
				EndDate:     "2025-01-03",
			},
		},
		FreeReservation: &isFree,
	}
	result, err := svc.Create(ctx, cmd, "user-123", "user")
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ForbiddenError{}, err)
	assert.Contains(t, err.Error(), "Only admins can create free reservations")
}

func TestCreate_CostCalculation_SingleItem(t *testing.T) {
	mockRepo, mockEquipRepo, mockUserRepo, mockEmailService, svc := setupTestService()
	ctx := context.Background()
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: "eq-1",
				StartDate:   "2025-01-01",
				EndDate:     "2025-01-03",
			},
		},
	}
	name := "Test Equipment"
	equipment := &types.PublicEquipmentSelect{
		ID:         "eq-1",
		Name:       &name,
		TypeID:     "type-1",
		Status:     constants.EquipmentStatusOK,
		IsArchived: false,
	}
	equipmentType := &types.PublicEquipmentTypesSelect{
		ID:               "type-1",
		CreditCostPerDay: 10,
	}
	expectedCost := int32(3 * 10)
	newBalance := int32(70)
	reservationIDs := []string{"res-new-1"}
	mockEquipRepo.On("GetByID", ctx, "eq-1").Return(equipment, nil)
	mockEquipRepo.On("GetTypeByID", ctx, "type-1").Return(equipmentType, nil)
	mockRepo.On(
		"CreateReservationsAtomic",
		ctx,
		"user-123",
		expectedCost,
		false,
		"user-123",
		cmd.Reservations,
	).Return(reservationIDs, newBalance, nil)
	mockUserRepo.On("GetByID", mock.Anything, "user-123").Return(&types.PublicProfilesSelect{Email: "user@test.com"}, nil)
	mockEmailService.On("SendReservationConfirmation", mock.Anything, "user@test.com", map[string]interface{}{
		"user_id": "user-123",
		"count":   1,
		"cost":    expectedCost,
		"balance": newBalance,
	}).Return(nil)
	result, err := svc.Create(ctx, cmd, "user-123", "user")
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedCost, result.TotalCreditCost)
	assert.Equal(t, newBalance, result.RemainingBalance)
	assert.Len(t, result.Reservations, 1)
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}

func TestCreate_InsufficientCredits_ConflictError(t *testing.T) {
	mockRepo, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: "eq-1",
				StartDate:   "2025-01-01",
				EndDate:     "2025-01-03",
			},
		},
	}
	name := "Test Equipment"
	equipment := &types.PublicEquipmentSelect{
		ID:         "eq-1",
		Name:       &name,
		TypeID:     "type-1",
		Status:     constants.EquipmentStatusOK,
		IsArchived: false,
	}
	equipmentType := &types.PublicEquipmentTypesSelect{
		ID:               "type-1",
		CreditCostPerDay: 10,
	}
	expectedCost := int32(30)
	mockEquipRepo.On("GetByID", ctx, "eq-1").Return(equipment, nil)
	mockEquipRepo.On("GetTypeByID", ctx, "type-1").Return(equipmentType, nil)
	mockRepo.On(
		"CreateReservationsAtomic",
		ctx,
		"user-123",
		expectedCost,
		false,
		"user-123",
		cmd.Reservations,
	).Return(nil, int32(0), types.NewConflictError("Insufficient credits", nil))
	result, err := svc.Create(ctx, cmd, "user-123", "user")
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ConflictError{}, err)
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}
func TestUpdate_ReturnEarlyRefundsCredits(t *testing.T) {
	mockRepo, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()
	userID := "user-123"
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:          reservationID,
			UserID:      userID,
			Status:      constants.ReservationStatusRented,
			EquipmentID: "eq-1",
			StartDate:   "2025-01-01",
			EndDate:     "2025-01-03",
		},
	}
	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)
	returnedStatus := constants.ReservationStatusReturned
	newEndDate := "2025-01-01"
	cmd := types.UpdateReservationCommand{
		Status:  &returnedStatus,
		EndDate: &newEndDate,
	}
	mockRepo.On("GetOverlappingReservations", ctx, "eq-1", "2025-01-01", "2025-01-01", &reservationID).Return([]types.PublicReservationsSelect{}, nil)
	mockRepo.On("ModifyReservationDatesWithCredits", ctx, reservationID, "admin-999", "2025-01-01", "2025-01-01").
		Return(&types.ModifyDatesResponse{
			ID:               reservationID,
			StartDate:        "2025-01-01",
			EndDate:          "2025-01-01",
			CreditAdjustment: 20,
			NewBalance:       120,
			UpdatedAt:        "2025-01-01T12:00:00Z",
		}, nil)
	updatedRes := &types.PublicReservationsSelect{
		ID:          reservationID,
		EquipmentID: "eq-1",
		Status:      constants.ReservationStatusReturned,
		StartDate:   "2025-01-01",
		EndDate:     "2025-01-01",
	}
	name := "Test Equipment"
	equipment := &types.PublicEquipmentSelect{
		ID:     "eq-1",
		Name:   &name,
		TypeID: "type-1",
		Status: constants.EquipmentStatusOK,
	}
	equipmentType := &types.PublicEquipmentTypesSelect{
		ID:               "type-1",
		CreditCostPerDay: 10,
	}
	mockEquipRepo.On("GetByID", ctx, "eq-1").Return(equipment, nil)
	mockEquipRepo.On("GetTypeByID", ctx, "type-1").Return(equipmentType, nil)
	mockRepo.On("UpdateReservation", ctx, reservationID, mock.Anything, "admin-999").Return(updatedRes, nil)
	result, err := svc.Update(ctx, reservationID, cmd, "admin-999", auth.RoleAdmin)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, int32(20), result.CreditAdjustment)
	assert.Equal(t, int32(120), result.RemainingBalance)
	assert.Equal(t, constants.ReservationStatusReturned, result.Status)
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}
func TestUpdate_CancelRefundsCreditsAndGetsNewBalance(t *testing.T) {
	mockRepo, mockEquipRepo, mockUserRepo, _, svc := setupTestService()
	ctx := context.Background()
	userID := "user-123"
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:          reservationID,
			UserID:      userID,
			Status:      constants.ReservationStatusPending,
			EquipmentID: "eq-1",
			StartDate:   "2025-01-01",
			EndDate:     "2025-01-03",
			IsFree:      false,
		},
	}
	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)
	cancelledStatus := constants.ReservationStatusCancelled
	cmd := types.UpdateReservationCommand{
		Status: &cancelledStatus,
	}
	name := "Test Equipment"
	equipment := &types.PublicEquipmentSelect{
		ID:     "eq-1",
		Name:   &name,
		TypeID: "type-1",
		Status: constants.EquipmentStatusOK,
	}
	equipmentType := &types.PublicEquipmentTypesSelect{
		ID:               "type-1",
		CreditCostPerDay: 10,
	}
	mockEquipRepo.On("GetByID", ctx, "eq-1").Return(equipment, nil)
	mockEquipRepo.On("GetTypeByID", ctx, "type-1").Return(equipmentType, nil)
	mockRepo.On("RefundCredits", ctx, reservationID, int32(30)).Return(nil)
	mockUserRepo.On("GetByID", mock.Anything, userID).Return(&types.PublicProfilesSelect{
		ID:            userID,
		CreditBalance: 150,
	}, nil)
	updatedRes := &types.PublicReservationsSelect{
		ID:          reservationID,
		EquipmentID: "eq-1",
		Status:      constants.ReservationStatusCancelled,
		StartDate:   "2025-01-01",
		EndDate:     "2025-01-03",
	}
	mockRepo.On("UpdateReservation", ctx, reservationID, mock.Anything, userID).Return(updatedRes, nil)
	result, err := svc.Update(ctx, reservationID, cmd, userID, auth.RoleUser)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, int32(30), result.CreditAdjustment)
	assert.Equal(t, int32(150), result.RemainingBalance)
	assert.Equal(t, constants.ReservationStatusCancelled, result.Status)
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
	mockUserRepo.AssertExpectations(t)
}
func TestUpdate_CancelRefund_LookupErrors(t *testing.T) {
	name := "Test Equipment"
	tests := []struct {
		name       string
		setupMocks func(ctx context.Context, equipRepo *mocks.MockEquipmentRepository)
		errContain string
	}{
		{
			name: "EquipmentLookupError",
			setupMocks: func(ctx context.Context, equipRepo *mocks.MockEquipmentRepository) {
				equipRepo.On("GetByID", ctx, "eq-1").Return(nil, assert.AnError)
			},
			errContain: "refund failed: equipment eq-1 not found",
		},
		{
			name: "EquipmentTypeLookupError",
			setupMocks: func(ctx context.Context, equipRepo *mocks.MockEquipmentRepository) {
				equipRepo.On("GetByID", ctx, "eq-1").Return(&types.PublicEquipmentSelect{
					ID:     "eq-1",
					Name:   &name,
					TypeID: "type-1",
					Status: constants.EquipmentStatusOK,
				}, nil)
				equipRepo.On("GetTypeByID", ctx, "type-1").Return(nil, assert.AnError)
			},
			errContain: "refund failed: equipment type type-1 not found",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockRepo, mockEquipRepo, _, _, svc := setupTestService()
			ctx := context.Background()
			userID := "user-123"
			reservationID := "res-456"
			reservation := &types.ReservationDetail{
				ReservationListItem: types.ReservationListItem{
					ID:          reservationID,
					UserID:      userID,
					Status:      constants.ReservationStatusPending,
					EquipmentID: "eq-1",
					StartDate:   "2025-01-01",
					EndDate:     "2025-01-03",
					IsFree:      false,
				},
			}
			mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)
			cancelledStatus := constants.ReservationStatusCancelled
			cmd := types.UpdateReservationCommand{Status: &cancelledStatus}
			tt.setupMocks(ctx, mockEquipRepo)
			result, err := svc.Update(ctx, reservationID, cmd, userID, auth.RoleUser)
			require.Error(t, err)
			assert.Nil(t, result)
			assert.Contains(t, err.Error(), tt.errContain)
			mockRepo.AssertExpectations(t)
			mockEquipRepo.AssertExpectations(t)
		})
	}
}
