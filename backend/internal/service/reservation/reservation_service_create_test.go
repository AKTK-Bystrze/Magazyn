package reservation_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

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

func TestCreate_ConflictWithExistingReservation_ConflictError(t *testing.T) {
	mockRepo, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{EquipmentID: "eq-1", StartDate: "2025-01-01", EndDate: "2025-01-03"},
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
	).Return(nil, int32(0), errors.New("equipment already reserved for selected dates"))

	result, err := svc.Create(ctx, cmd, "user-123", "user")
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ConflictError{}, err)
	assert.Contains(t, err.Error(), "equipment already reserved")
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}

func TestCreate_AtomicRPC_DatabaseError(t *testing.T) {
	mockRepo, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{EquipmentID: "eq-1", StartDate: "2025-01-01", EndDate: "2025-01-03"},
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
	).Return(nil, int32(0), errors.New("rpc execution timeout"))

	result, err := svc.Create(ctx, cmd, "user-123", "user")
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ConflictError{}, err)
	assert.Contains(t, err.Error(), "rpc execution timeout")
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}

func TestCreate_EmailNotificationFailure_DoesNotFailReservation(t *testing.T) {
	mockRepo, mockEquipRepo, mockUserRepo, mockEmailService, svc := setupTestService()
	ctx := context.Background()
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{EquipmentID: "eq-1", StartDate: "2025-01-01", EndDate: "2025-01-03"},
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
	mockEmailService.On("SendReservationConfirmation", mock.Anything, "user@test.com", mock.Anything).Return(errors.New("smtp connection failed"))

	result, err := svc.Create(ctx, cmd, "user-123", "user")
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedCost, result.TotalCreditCost)
	assert.Equal(t, newBalance, result.RemainingBalance)
	assert.Len(t, result.Reservations, 1)

	// Allow goroutine for async email to run
	time.Sleep(10 * time.Millisecond)
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}
