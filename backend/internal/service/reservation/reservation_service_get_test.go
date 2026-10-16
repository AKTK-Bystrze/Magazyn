package reservation_test

import (
	"context"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
)

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
			res := &types.ReservationDetail{
				ReservationListItem: types.ReservationListItem{
					ID:     reservationID,
					UserID: "user-123",
					Status: constants.ReservationStatusPending,
				},
			}
			mockRepo.On("GetReservationByID", ctx, reservationID).Return(res, nil)
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

	t.Run("DatabaseError", func(t *testing.T) {
		mockRepo, _, _, _, svc := setupTestService()
		ctx := context.Background()
		reservationID := "res-nonexistent"
		mockRepo.On("GetReservationByID", ctx, reservationID).Return(nil, types.NewNotFoundError("Reservation", reservationID))
		result, err := svc.GetByID(ctx, reservationID, "user-123", auth.RoleUser)
		assert.Error(t, err)
		assert.Nil(t, result)
		assert.IsType(t, &types.NotFoundError{}, err)
		mockRepo.AssertExpectations(t)
	})
}
