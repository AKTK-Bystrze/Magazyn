package credit_test

import (
	"context"
	"testing"

	"magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
)

func TestCreditRequestService_CreateRequest_NegativeCredits(t *testing.T) {
	repo := mocks.NewMockCreditRequestRepository()
	service := credit.NewCreditRequestService(repo)
	req := types.CreateCreditRequestDTO{
		Title:        "Test",
		CreditsValue: 0,
		UserHelpedID: "u2",
		Helpers:      []string{"u3"},
	}
	_, err := service.CreateRequest(context.Background(), "u1", req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "credits_value must be strictly positive")
}
func TestCreditRequestService_CreateRequest_Success(t *testing.T) {
	repo := mocks.NewMockCreditRequestRepository()
	service := credit.NewCreditRequestService(repo)
	req := types.CreateCreditRequestDTO{
		Title:        "Test Title",
		CreditsValue: 5,
		UserHelpedID: "u2",
		Helpers:      []string{"u3"},
	}
	res, err := service.CreateRequest(context.Background(), "u1", req)
	assert.NoError(t, err)
	assert.Equal(t, "Test Title", res.Title)
	assert.Equal(t, types.CreditRequestStatusAwaiting, res.Status)
}
func TestCreditRequestService_UpdateRequest(t *testing.T) {
	newTitle := "new title"
	tests := []struct {
		name       string
		user       string
		status     types.CreditRequestStatus
		wantErr    bool
		errContain string
	}{
		{
			name:       "Locked",
			user:       "u1",
			status:     types.CreditRequestStatusApproved,
			wantErr:    true,
			errContain: "Only awaiting requests can be modified",
		},
		{
			name:       "NotRequestor",
			user:       "other-user",
			status:     types.CreditRequestStatusAwaiting,
			wantErr:    true,
			errContain: "not the requestor",
		},
		{
			name:    "Success",
			user:    "u1",
			status:  types.CreditRequestStatusAwaiting,
			wantErr: false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqID := "req1"
			ownerID := "u1"
			repo := &mocks.MockCreditRequestRepository{Data: map[string]*types.CreditRequestDTO{
				reqID: {
					ID:           reqID,
					RequestorID:  &ownerID,
					Status:       tt.status,
					CreditsValue: 10,
				},
			}}
			service := credit.NewCreditRequestService(repo)
			res, err := service.UpdateRequest(context.Background(), tt.user, reqID, types.UpdateCreditRequestDTO{Title: &newTitle})
			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errContain)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, newTitle, res.Title)
			}
		})
	}
}

func TestCreditRequestService_ReviewRequest(t *testing.T) {
	zeroVal := int32(0)
	posVal := int32(20)
	tests := []struct {
		name       string
		initStatus types.CreditRequestStatus
		dto        types.ReviewCreditRequestDTO
		wantErr    bool
		errContain string
	}{
		{
			name:       "NegativeCredits",
			initStatus: types.CreditRequestStatusAwaiting,
			dto:        types.ReviewCreditRequestDTO{Status: types.CreditRequestStatusApproved, CreditsValue: &zeroVal},
			wantErr:    true,
			errContain: "credits_value must be strictly positive",
		},
		{
			name:       "NotAwaiting",
			initStatus: types.CreditRequestStatusApproved,
			dto:        types.ReviewCreditRequestDTO{Status: types.CreditRequestStatusRejected},
			wantErr:    true,
			errContain: "Only awaiting requests can be reviewed",
		},
		{
			name:       "InvalidStatus",
			initStatus: types.CreditRequestStatusAwaiting,
			dto:        types.ReviewCreditRequestDTO{Status: types.CreditRequestStatusAwaiting},
			wantErr:    true,
			errContain: "Invalid status",
		},
		{
			name:       "Success",
			initStatus: types.CreditRequestStatusAwaiting,
			dto:        types.ReviewCreditRequestDTO{Status: types.CreditRequestStatusApproved, CreditsValue: &posVal, Helpers: []string{"u2", "u3"}},
			wantErr:    false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reqID := "req1"
			userID := "u1"
			repo := &mocks.MockCreditRequestRepository{Data: map[string]*types.CreditRequestDTO{
				reqID: {
					ID:           reqID,
					RequestorID:  &userID,
					Status:       tt.initStatus,
					CreditsValue: 10,
					Helpers:      []string{"u2"},
				},
			}}
			service := credit.NewCreditRequestService(repo)
			err := service.ReviewRequest(context.Background(), "admin1", reqID, tt.dto)
			if tt.wantErr {
				assert.Error(t, err)
				assert.Contains(t, err.Error(), tt.errContain)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, types.CreditRequestStatusApproved, repo.Data[reqID].Status)
				assert.Equal(t, int32(20), repo.Data[reqID].CreditsValue)
				assert.Equal(t, []string{"u2", "u3"}, repo.Data[reqID].Helpers)
			}
		})
	}
}
func TestCreditRequestService_ListRequests_Success(t *testing.T) {
	repo := mocks.NewMockCreditRequestRepository()
	service := credit.NewCreditRequestService(repo)
	res, err := service.ListRequests(context.Background(), 1, 10)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, 1, res.Pagination.Page)
	assert.Equal(t, 10, res.Pagination.PerPage)
}
