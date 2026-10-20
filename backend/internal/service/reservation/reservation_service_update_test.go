package reservation_test

import (
	"context"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func TestUpdate_UserRestrictions(t *testing.T) {
	rentedStatus := constants.ReservationStatusRented
	returnedStatus := constants.ReservationStatusReturned
	cancelledStatus := constants.ReservationStatusCancelled
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
			name:       "NonOwnerCannotReturnRented",
			reqUser:    "user-999",
			initStatus: constants.ReservationStatusRented,
			cmd:        types.UpdateReservationCommand{Status: &returnedStatus},
			errCheck: func(t *testing.T, err error) {
				assert.IsType(t, &types.ForbiddenError{}, err)
				assert.Contains(t, err.Error(), "Not allowed")
			},
		},
		{
			name:       "NonOwnerCannotReturnPending",
			reqUser:    "user-999",
			initStatus: constants.ReservationStatusPending,
			cmd:        types.UpdateReservationCommand{Status: &returnedStatus},
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
			name:       "CannotCancelRented",
			reqUser:    "user-123",
			initStatus: constants.ReservationStatusRented,
			cmd:        types.UpdateReservationCommand{Status: &cancelledStatus},
			errCheck: func(t *testing.T, err error) {
				assert.IsType(t, &types.ForbiddenError{}, err)
				assert.Contains(t, err.Error(), "Cannot cancel non-pending reservation")
			},
		},
		{
			name:       "CannotReturnAlreadyReturned",
			reqUser:    "user-123",
			initStatus: constants.ReservationStatusReturned,
			cmd:        types.UpdateReservationCommand{Status: &returnedStatus},
			errCheck: func(t *testing.T, err error) {
				assert.IsType(t, &types.ForbiddenError{}, err)
				assert.Contains(t, err.Error(), "Cannot modify non-pending reservation")
			},
		},
		{
			name:       "CannotReturnCancelled",
			reqUser:    "user-123",
			initStatus: constants.ReservationStatusCancelled,
			cmd:        types.UpdateReservationCommand{Status: &returnedStatus},
			errCheck: func(t *testing.T, err error) {
				assert.IsType(t, &types.ValidationError{}, err)
				assert.Contains(t, err.Error(), "Can only return active reservations")
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

func TestUpdate_OwnerCanReturnRented(t *testing.T) {
	mockRepo, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:          reservationID,
			UserID:      "user-123",
			Status:      constants.ReservationStatusRented,
			EquipmentID: "eq-1",
			StartDate:   "2025-01-01",
			EndDate:     "2025-01-03",
			IsFree:      false,
		},
	}
	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)
	returnedStatus := constants.ReservationStatusReturned
	cmd := types.UpdateReservationCommand{
		Status: &returnedStatus,
	}
	updatedRes := &types.PublicReservationsSelect{
		ID:          reservationID,
		EquipmentID: "eq-1",
		Status:      constants.ReservationStatusReturned,
		StartDate:   "2025-01-01",
		EndDate:     "2025-01-03",
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
	mockRepo.On("UpdateReservation", ctx, reservationID, mock.MatchedBy(func(u types.PublicReservationsUpdate) bool {
		return u.Status != nil && *u.Status == returnedStatus
	}), "user-123").Return(updatedRes, nil)

	result, err := svc.Update(ctx, reservationID, cmd, "user-123", auth.RoleUser)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, constants.ReservationStatusReturned, result.Status)
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}

func TestUpdate_AdminCanChangeStatus(t *testing.T) {
	mockRepo, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:          reservationID,
			UserID:      "user-123",
			Status:      constants.ReservationStatusPending,
			EquipmentID: "eq-1",
			StartDate:   "2025-01-01",
			EndDate:     "2025-01-03",
			IsFree:      false,
		},
	}
	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)
	rentedStatus := constants.ReservationStatusRented
	cmd := types.UpdateReservationCommand{
		Status: &rentedStatus,
	}
	updatedRes := &types.PublicReservationsSelect{
		ID:          reservationID,
		EquipmentID: "eq-1",
		Status:      constants.ReservationStatusRented,
		StartDate:   "2025-01-01",
		EndDate:     "2025-01-03",
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
	mockRepo.On("UpdateReservation", ctx, reservationID, mock.MatchedBy(func(u types.PublicReservationsUpdate) bool {
		return u.Status != nil && *u.Status == rentedStatus
	}), "admin-999").Return(updatedRes, nil)

	result, err := svc.Update(ctx, reservationID, cmd, "admin-999", auth.RoleAdmin)
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, constants.ReservationStatusRented, result.Status)
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
