package reservation_test

import (
	"context"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ============================================================================
// Test Helpers
// ============================================================================

// setupTestService creates a service with all mocks
func setupTestService() (*mocks.MockReservationRepository, *mocks.MockEquipmentRepository, *mocks.MockUserRepository, *mocks.MockEmailService, reservation.ReservationService) {
	mockRepo := new(mocks.MockReservationRepository)
	mockEquipRepo := new(mocks.MockEquipmentRepository)
	mockUserRepo := new(mocks.MockUserRepository)
	mockEmailService := new(mocks.MockEmailService)
	svc := reservation.NewReservationService(mockRepo, mockEquipRepo, mockUserRepo, mockEmailService)
	return mockRepo, mockEquipRepo, mockUserRepo, mockEmailService, svc
}

// ============================================================================
// Authorization Tests - GetByID
// ============================================================================

func TestGetByID_OwnerCanView(t *testing.T) {
	// Arrange
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()

	userID := "user-123"
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:     reservationID,
			UserID: userID,
			Status: constants.ReservationStatusPending,
		},
	}

	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)

	// Act
	result, err := svc.GetByID(ctx, reservationID, userID, auth.RoleUser)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, reservationID, result.ID)
	mockRepo.AssertExpectations(t)
}

func TestGetByID_NonOwnerForbidden(t *testing.T) {
	// Arrange
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()

	ownerID := "user-123"
	requestingUserID := "user-999"
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:     reservationID,
			UserID: ownerID,
			Status: constants.ReservationStatusPending,
		},
	}

	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)

	// Act
	result, err := svc.GetByID(ctx, reservationID, requestingUserID, auth.RoleUser)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ForbiddenError{}, err)
	mockRepo.AssertExpectations(t)
}

func TestGetByID_AdminCanViewAny(t *testing.T) {
	// Arrange
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()

	ownerID := "user-123"
	adminID := "admin-999"
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:     reservationID,
			UserID: ownerID,
			Status: constants.ReservationStatusPending,
		},
	}

	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)

	// Act
	result, err := svc.GetByID(ctx, reservationID, adminID, auth.RoleAdmin)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, reservationID, result.ID)
	mockRepo.AssertExpectations(t)
}

func TestGetByID_SuperAdminCanViewAny(t *testing.T) {
	// Arrange
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()

	ownerID := "user-123"
	superAdminID := "superadmin-999"
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:     reservationID,
			UserID: ownerID,
			Status: constants.ReservationStatusPending,
		},
	}

	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)

	// Act
	result, err := svc.GetByID(ctx, reservationID, superAdminID, auth.RoleSuperAdmin)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, reservationID, result.ID)
	mockRepo.AssertExpectations(t)
}

// ============================================================================
// Authorization Tests - Update
// ============================================================================

func TestUpdate_UserCannotUpdateOthers(t *testing.T) {
	// Arrange
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()

	ownerID := "user-123"
	requestingUserID := "user-999"
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:     reservationID,
			UserID: ownerID,
			Status: constants.ReservationStatusPending,
		},
	}

	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)

	cmd := types.UpdateReservationCommand{}

	// Act
	result, err := svc.Update(ctx, reservationID, cmd, requestingUserID, auth.RoleUser)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ForbiddenError{}, err)
	assert.Contains(t, err.Error(), "Not allowed")
	mockRepo.AssertExpectations(t)
}

func TestUpdate_UserCannotModifyNonPending(t *testing.T) {
	// Arrange
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()

	userID := "user-123"
	reservationID := "res-456"
	reservation := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:     reservationID,
			UserID: userID,
			Status: constants.ReservationStatusRented,
		},
	}

	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)

	cmd := types.UpdateReservationCommand{}

	// Act
	result, err := svc.Update(ctx, reservationID, cmd, userID, auth.RoleUser)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ForbiddenError{}, err)
	assert.Contains(t, err.Error(), "Cannot modify non-pending reservation")
	mockRepo.AssertExpectations(t)
}

func TestUpdate_UserCanOnlyCancelOrReturn(t *testing.T) {
	// Arrange
	mockRepo, _, _, _, svc := setupTestService()
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
		},
	}

	mockRepo.On("GetReservationByID", ctx, reservationID).Return(reservation, nil)

	// Try to set status to RENTED (not allowed for users - only admin can rent out)
	rentedStatus := constants.ReservationStatusRented
	cmd := types.UpdateReservationCommand{
		Status: &rentedStatus,
	}

	// Act
	result, err := svc.Update(ctx, reservationID, cmd, userID, auth.RoleUser)

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ValidationError{}, err)
	assert.Contains(t, err.Error(), "Users can only cancel or return")
	mockRepo.AssertExpectations(t)
}

// ============================================================================
// Business Logic Tests - List
// ============================================================================

func TestList_Success(t *testing.T) {
	// Arrange
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

	// Act
	result, err := svc.List(ctx, query)

	// Assert
	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Len(t, result.Reservations, 2)
	assert.Equal(t, 1, result.Pagination.Page)
	assert.Equal(t, 25, result.Pagination.PerPage)
	assert.Equal(t, 2, result.Pagination.TotalItems)
	assert.Equal(t, 1, result.Pagination.TotalPages)
	mockRepo.AssertExpectations(t)
}

func TestList_PaginationCalculation(t *testing.T) {
	// Arrange
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()

	query := types.ReservationListQuery{
		Page:    1,
		PerPage: 10,
	}

	items := []types.ReservationListItem{}
	total := int64(47) // Should result in 5 pages

	mockRepo.On("GetReservations", ctx, query).Return(items, total, nil)

	// Act
	result, err := svc.List(ctx, query)

	// Assert
	assert.NoError(t, err)
	assert.Equal(t, 5, result.Pagination.TotalPages)
	mockRepo.AssertExpectations(t)
}

// ============================================================================
// Business Logic Tests - Create
// ============================================================================

func TestCreate_EquipmentNotFound_ValidationError(t *testing.T) {
	// Arrange
	_, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()

	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: "nonexistent-eq",
				StartDate:   "2025-01-01",
				EndDate:     "2025-01-03",
			},
		},
	}

	mockEquipRepo.On("GetByID", ctx, "nonexistent-eq").Return(nil, types.NewNotFoundError("Equipment", "nonexistent-eq"))

	// Act
	result, err := svc.Create(ctx, cmd, "user-123")

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ValidationError{}, err)
	assert.Contains(t, err.Error(), "not found")
	mockEquipRepo.AssertExpectations(t)
}

func TestCreate_EquipmentArchived_ValidationError(t *testing.T) {
	// Arrange
	_, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()

	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: "eq-archived",
				StartDate:   "2025-01-01",
				EndDate:     "2025-01-03",
			},
		},
	}

	name := "Archived Equipment"
	equipment := &types.PublicEquipmentSelect{
		ID:         "eq-archived",
		Name:       &name,
		TypeID:     "type-1",
		Status:     constants.EquipmentStatusOK,
		IsArchived: true,
	}

	mockEquipRepo.On("GetByID", ctx, "eq-archived").Return(equipment, nil)

	// Act
	result, err := svc.Create(ctx, cmd, "user-123")

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ValidationError{}, err)
	assert.Contains(t, err.Error(), "not available")
	mockEquipRepo.AssertExpectations(t)
}

func TestCreate_EquipmentBroken_ValidationError(t *testing.T) {
	// Arrange
	_, mockEquipRepo, _, _, svc := setupTestService()
	ctx := context.Background()

	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: "eq-broken",
				StartDate:   "2025-01-01",
				EndDate:     "2025-01-03",
			},
		},
	}

	name := "Broken Equipment"
	equipment := &types.PublicEquipmentSelect{
		ID:         "eq-broken",
		Name:       &name,
		TypeID:     "type-1",
		Status:     constants.EquipmentStatusBroken,
		IsArchived: false,
	}

	mockEquipRepo.On("GetByID", ctx, "eq-broken").Return(equipment, nil)

	// Act
	result, err := svc.Create(ctx, cmd, "user-123")

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ValidationError{}, err)
	assert.Contains(t, err.Error(), "not available")
	mockEquipRepo.AssertExpectations(t)
}

func TestCreate_CostCalculation_SingleItem(t *testing.T) {
	// Arrange
	mockRepo, mockEquipRepo, mockUserRepo, mockEmailService, svc := setupTestService()
	ctx := context.Background()

	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: "eq-1",
				StartDate:   "2025-01-01",
				EndDate:     "2025-01-03", // 3 days
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

	expectedCost := int32(3 * 10) // 3 days × 10 credits/day = 30
	newBalance := int32(70)
	reservationIDs := []string{"res-new-1"}

	mockEquipRepo.On("GetByID", ctx, "eq-1").Return(equipment, nil)
	mockEquipRepo.On("GetTypeByID", ctx, "type-1").Return(equipmentType, nil)
	mockRepo.On("CreateReservationsAtomic", ctx, "user-123", expectedCost, cmd.Reservations).Return(reservationIDs, newBalance, nil)
	mockUserRepo.On("GetByID", ctx, "user-123").Return(&types.PublicProfilesSelect{Email: "user@test.com"}, nil)
	mockEmailService.On("SendReservationConfirmation", ctx, "user@test.com", map[string]interface{}{
		"user_id": "user-123",
		"count":   1,
		"cost":    expectedCost,
		"balance": newBalance,
	}).Return(nil)

	// Act
	result, err := svc.Create(ctx, cmd, "user-123")

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, expectedCost, result.TotalCreditCost)
	assert.Equal(t, newBalance, result.RemainingBalance)
	assert.Len(t, result.Reservations, 1)
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}

func TestCreate_InsufficientCredits_ConflictError(t *testing.T) {
	// Arrange
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
	mockRepo.On("CreateReservationsAtomic", ctx, "user-123", expectedCost, cmd.Reservations).Return(nil, int32(0), types.NewConflictError("Insufficient credits", nil))

	// Act
	result, err := svc.Create(ctx, cmd, "user-123")

	// Assert
	assert.Error(t, err)
	assert.Nil(t, result)
	assert.IsType(t, &types.ConflictError{}, err)
	mockRepo.AssertExpectations(t)
	mockEquipRepo.AssertExpectations(t)
}
