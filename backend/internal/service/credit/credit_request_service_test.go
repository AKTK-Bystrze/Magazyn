package credit_test

import (
	"context"
	"magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/types"
	"testing"

	"github.com/stretchr/testify/assert"
)

// We mock the repository
type mockCreditRequestRepo struct {
	data map[string]*types.CreditRequestDTO
}

func (m *mockCreditRequestRepo) ListRequests(ctx context.Context, page, perPage int) ([]types.CreditRequestDTO, int64, error) {
	return nil, 0, nil
}
func (m *mockCreditRequestRepo) GetByID(ctx context.Context, id string) (*types.CreditRequestDTO, error) {
	if item, ok := m.data[id]; ok {
		return item, nil
	}
	return nil, types.NewNotFoundError("CreditRequest", id)
}
func (m *mockCreditRequestRepo) Create(ctx context.Context, req types.CreditRequestDTO) (*types.CreditRequestDTO, error) {
	req.ID = "new-id"
	m.data["new-id"] = &req
	return &req, nil
}
func (m *mockCreditRequestRepo) Update(ctx context.Context, id string, req types.CreditRequestDTO) (*types.CreditRequestDTO, error) {
	m.data[id] = &req
	return &req, nil
}
func (m *mockCreditRequestRepo) ReviewAtomic(ctx context.Context, id string, adminID string, status types.CreditRequestStatus, creditsValue *int32, helpers []string, reason string, description string) error {
	m.data[id].Status = status
	if creditsValue != nil {
		m.data[id].CreditsValue = *creditsValue
	}
	if helpers != nil {
		m.data[id].Helpers = helpers
	}
	return nil
}
func (m *mockCreditRequestRepo) GetLeaderboard(ctx context.Context) ([]types.UserCreditLeaderboardItem, error) {
	return nil, nil
}
func TestCreditRequestService_CreateRequest_NegativeCredits(t *testing.T) {
	repo := &mockCreditRequestRepo{data: make(map[string]*types.CreditRequestDTO)}
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
	repo := &mockCreditRequestRepo{data: make(map[string]*types.CreditRequestDTO)}
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
func TestCreditRequestService_UpdateRequest_Locked(t *testing.T) {
	reqID := "req1"
	userID := "u1"
	repo := &mockCreditRequestRepo{data: map[string]*types.CreditRequestDTO{
		reqID: {
			ID:           reqID,
			RequestorID:  &userID,
			Status:       types.CreditRequestStatusApproved,
			CreditsValue: 10,
		},
	}}
	service := credit.NewCreditRequestService(repo)
	req := types.UpdateCreditRequestDTO{
		Title: func() *string { s := "new title"; return &s }(),
	}
	_, err := service.UpdateRequest(context.Background(), userID, reqID, req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Only awaiting requests can be modified")
}
func TestCreditRequestService_UpdateRequest_NotRequestor(t *testing.T) {
	reqID := "req1"
	userID := "u1"
	repo := &mockCreditRequestRepo{data: map[string]*types.CreditRequestDTO{
		reqID: {
			ID:           reqID,
			RequestorID:  &userID,
			Status:       types.CreditRequestStatusAwaiting,
			CreditsValue: 10,
		},
	}}
	service := credit.NewCreditRequestService(repo)
	req := types.UpdateCreditRequestDTO{
		Title: func() *string { s := "new title"; return &s }(),
	}
	_, err := service.UpdateRequest(context.Background(), "other-user", reqID, req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "not the requestor")
}
func TestCreditRequestService_UpdateRequest_Success(t *testing.T) {
	reqID := "req1"
	userID := "u1"
	repo := &mockCreditRequestRepo{data: map[string]*types.CreditRequestDTO{
		reqID: {
			ID:           reqID,
			RequestorID:  &userID,
			Status:       types.CreditRequestStatusAwaiting,
			CreditsValue: 10,
		},
	}}
	service := credit.NewCreditRequestService(repo)
	req := types.UpdateCreditRequestDTO{
		Title: func() *string { s := "new title"; return &s }(),
	}
	res, err := service.UpdateRequest(context.Background(), userID, reqID, req)
	assert.NoError(t, err)
	assert.Equal(t, "new title", res.Title)
}
func TestCreditRequestService_ReviewRequest_NegativeCredits(t *testing.T) {
	reqID := "req1"
	userID := "u1"
	repo := &mockCreditRequestRepo{data: map[string]*types.CreditRequestDTO{
		reqID: {
			ID:           reqID,
			RequestorID:  &userID,
			Status:       types.CreditRequestStatusAwaiting,
			CreditsValue: 10,
		},
	}}
	service := credit.NewCreditRequestService(repo)
	badValue := int32(0)
	req := types.ReviewCreditRequestDTO{
		Status:       types.CreditRequestStatusApproved,
		CreditsValue: &badValue,
	}
	err := service.ReviewRequest(context.Background(), "admin1", reqID, req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "credits_value must be strictly positive")
}
func TestCreditRequestService_ReviewRequest_Success(t *testing.T) {
	reqID := "req1"
	userID := "u1"
	repo := &mockCreditRequestRepo{data: map[string]*types.CreditRequestDTO{
		reqID: {
			ID:           reqID,
			RequestorID:  &userID,
			Status:       types.CreditRequestStatusAwaiting,
			CreditsValue: 10,
			Helpers:      []string{"u2"},
		},
	}}
	service := credit.NewCreditRequestService(repo)
	newValue := int32(20)
	req := types.ReviewCreditRequestDTO{
		Status:       types.CreditRequestStatusApproved,
		CreditsValue: &newValue,
		Helpers:      []string{"u2", "u3"},
	}
	err := service.ReviewRequest(context.Background(), "admin1", reqID, req)
	assert.NoError(t, err)
	assert.Equal(t, types.CreditRequestStatusApproved, repo.data[reqID].Status)
	assert.Equal(t, int32(20), repo.data[reqID].CreditsValue)
	assert.Equal(t, []string{"u2", "u3"}, repo.data[reqID].Helpers)
}
func TestCreditRequestService_ReviewRequest_NotAwaiting(t *testing.T) {
	reqID := "req1"
	userID := "u1"
	repo := &mockCreditRequestRepo{data: map[string]*types.CreditRequestDTO{
		reqID: {
			ID:           reqID,
			RequestorID:  &userID,
			Status:       types.CreditRequestStatusApproved,
			CreditsValue: 10,
		},
	}}
	service := credit.NewCreditRequestService(repo)
	req := types.ReviewCreditRequestDTO{
		Status: types.CreditRequestStatusRejected,
	}
	err := service.ReviewRequest(context.Background(), "admin1", reqID, req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Only awaiting requests can be reviewed")
}
func TestCreditRequestService_ReviewRequest_InvalidStatus(t *testing.T) {
	reqID := "req1"
	userID := "u1"
	repo := &mockCreditRequestRepo{data: map[string]*types.CreditRequestDTO{
		reqID: {
			ID:           reqID,
			RequestorID:  &userID,
			Status:       types.CreditRequestStatusAwaiting,
			CreditsValue: 10,
		},
	}}
	service := credit.NewCreditRequestService(repo)
	req := types.ReviewCreditRequestDTO{
		Status: types.CreditRequestStatusAwaiting,
	}
	err := service.ReviewRequest(context.Background(), "admin1", reqID, req)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Invalid status")
}
func TestCreditRequestService_ListRequests_Success(t *testing.T) {
	repo := &mockCreditRequestRepo{data: make(map[string]*types.CreditRequestDTO)}
	service := credit.NewCreditRequestService(repo)
	res, err := service.ListRequests(context.Background(), 1, 10)
	assert.NoError(t, err)
	assert.NotNil(t, res)
	assert.Equal(t, 1, res.Pagination.Page)
	assert.Equal(t, 10, res.Pagination.PerPage)
}
