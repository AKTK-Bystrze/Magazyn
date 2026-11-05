package reservation_test

import (
	"context"
	"errors"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestBulkUpdate_Success(t *testing.T) {
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()
	adminID := "admin-123"
	cmd := types.BulkUpdateReservationsCommand{
		ReservationIDs: []string{"res-1", "res-2"},
		Status:         constants.ReservationStatusRented,
	}
	expectedResp := &types.BulkStatusUpdateResponse{
		UpdatedCount: 2,
		RefundCount:  0,
	}

	mockRepo.On("BulkUpdateStatusAtomic", ctx, cmd.ReservationIDs, cmd.Status, adminID).
		Return(expectedResp, nil)

	resp, err := svc.BulkUpdate(ctx, cmd, adminID, auth.RoleAdmin)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, expectedResp.UpdatedCount, resp.UpdatedCount)
	assert.Equal(t, expectedResp.RefundCount, resp.RefundCount)
	mockRepo.AssertExpectations(t)
}

func TestBulkUpdate_DatabaseError(t *testing.T) {
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()
	adminID := "admin-123"
	cmd := types.BulkUpdateReservationsCommand{
		ReservationIDs: []string{"res-1"},
		Status:         constants.ReservationStatusCancelled,
	}
	dbErr := errors.New("database transaction deadlock")

	mockRepo.On("BulkUpdateStatusAtomic", ctx, cmd.ReservationIDs, cmd.Status, adminID).
		Return(nil, dbErr)

	resp, err := svc.BulkUpdate(ctx, cmd, adminID, auth.RoleAdmin)
	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.Equal(t, dbErr, err)
	mockRepo.AssertExpectations(t)
}

func TestBulkUpdate_UserOwnReservations_Success(t *testing.T) {
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()
	userID := "user-123"
	cmd := types.BulkUpdateReservationsCommand{
		ReservationIDs: []string{"res-1", "res-2"},
		Status:         constants.ReservationStatusReturned,
	}

	mockRepo.On("GetReservationByID", ctx, "res-1").
		Return(&types.ReservationDetail{
			ID:     "res-1",
			UserID: userID,
			Status: constants.ReservationStatusRented,
		}, nil)

	mockRepo.On("GetReservationByID", ctx, "res-2").
		Return(&types.ReservationDetail{
			ID:     "res-2",
			UserID: userID,
			Status: constants.ReservationStatusPending,
		}, nil)

	expectedResp := &types.BulkStatusUpdateResponse{
		UpdatedCount: 2,
		RefundCount:  0,
	}
	mockRepo.On("BulkUpdateStatusAtomic", ctx, cmd.ReservationIDs, cmd.Status, userID).
		Return(expectedResp, nil)

	resp, err := svc.BulkUpdate(ctx, cmd, userID, auth.RoleUser)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, expectedResp.UpdatedCount, resp.UpdatedCount)
	mockRepo.AssertExpectations(t)
}

func TestBulkUpdate_UserOtherUserReservation_Forbidden(t *testing.T) {
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()
	userID := "user-123"
	cmd := types.BulkUpdateReservationsCommand{
		ReservationIDs: []string{"res-1"},
		Status:         constants.ReservationStatusReturned,
	}

	mockRepo.On("GetReservationByID", ctx, "res-1").
		Return(&types.ReservationDetail{
			ID:     "res-1",
			UserID: "other-user",
			Status: constants.ReservationStatusRented,
		}, nil)

	resp, err := svc.BulkUpdate(ctx, cmd, userID, auth.RoleUser)
	require.Error(t, err)
	assert.Nil(t, resp)
	assert.IsType(t, &types.ForbiddenError{}, err)
	mockRepo.AssertExpectations(t)
}

func TestGetDashboardStats_Success(t *testing.T) {
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()
	expectedSummary := &types.ReservationDashboardSummary{
		PendingReservations: 12,
		OverdueReservations: 1,
		ActiveToday:         4,
	}

	mockRepo.On("GetDashboardStats", ctx).Return(expectedSummary, nil)

	stats, err := svc.GetDashboardStats(ctx)
	require.NoError(t, err)
	assert.NotNil(t, stats)
	assert.Equal(t, int64(12), stats.PendingReservations)
	assert.Equal(t, int64(1), stats.OverdueReservations)
	assert.Equal(t, int64(4), stats.ActiveToday)
	mockRepo.AssertExpectations(t)
}

func TestGetDashboardStats_Error(t *testing.T) {
	mockRepo, _, _, _, svc := setupTestService()
	ctx := context.Background()
	dbErr := errors.New("stats query failed")

	mockRepo.On("GetDashboardStats", ctx).Return(nil, dbErr)

	stats, err := svc.GetDashboardStats(ctx)
	assert.Error(t, err)
	assert.Nil(t, stats)
	assert.Equal(t, dbErr, err)
	mockRepo.AssertExpectations(t)
}
