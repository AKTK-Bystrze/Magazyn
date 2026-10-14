package reservation_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	handler "magazyn/backend/internal/handler/reservation"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

type MockReservationService struct {
	mock.Mock
}

func (m *MockReservationService) List(ctx context.Context, query types.ReservationListQuery, userID string, role string) (*types.ReservationListResponse, error) {
	args := m.Called(ctx, query, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ReservationListResponse), args.Error(1)
}

func (m *MockReservationService) GetByID(ctx context.Context, id string, userID string, role string) (*types.ReservationDetail, error) {
	args := m.Called(ctx, id, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ReservationDetail), args.Error(1)
}

func (m *MockReservationService) Create(ctx context.Context, cmd types.CreateReservationsCommand, userID string, role string) (*types.CreateReservationsResponse, error) {
	args := m.Called(ctx, cmd, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.CreateReservationsResponse), args.Error(1)
}

func (m *MockReservationService) Update(ctx context.Context, id string, cmd types.UpdateReservationCommand, userID string, role string) (*types.UpdateReservationResponse, error) {
	args := m.Called(ctx, id, cmd, userID, role)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.UpdateReservationResponse), args.Error(1)
}

func (m *MockReservationService) BulkUpdate(ctx context.Context, cmd types.BulkUpdateReservationsCommand, adminID string) (*types.BulkStatusUpdateResponse, error) {
	args := m.Called(ctx, cmd, adminID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.BulkStatusUpdateResponse), args.Error(1)
}

func (m *MockReservationService) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.ReservationDashboardSummary), args.Error(1)
}

func withUserContext(r *http.Request, userID string, role string) *http.Request {
	ctx := context.WithValue(r.Context(), appcontext.UserContextKey, &types.User{ID: userID})
	ctx = context.WithValue(ctx, appcontext.UserProfileContextKey, &types.PublicProfilesSelect{ID: userID, Role: role})
	return r.WithContext(ctx)
}

func TestHandleList_InvalidStatus_ReturnsBadRequest(t *testing.T) {
	mockSvc := new(MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	req := httptest.NewRequest(http.MethodGet, "/reservations?status=INVALID_STATUS", nil)
	req = withUserContext(req, "user-1", auth.RoleUser)
	rec := httptest.NewRecorder()

	h.HandleList(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	var resp map[string]string
	err := json.NewDecoder(rec.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "Invalid reservation status", resp["error"])
	mockSvc.AssertNotCalled(t, "List")
}

func TestHandleList_InvalidScope_ReturnsBadRequest(t *testing.T) {
	mockSvc := new(MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	req := httptest.NewRequest(http.MethodGet, "/reservations?scope=unknown_scope", nil)
	req = withUserContext(req, "user-1", auth.RoleUser)
	rec := httptest.NewRecorder()

	h.HandleList(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	var resp map[string]string
	err := json.NewDecoder(rec.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "Invalid scope: must be 'all' or 'my'", resp["error"])
	mockSvc.AssertNotCalled(t, "List")
}

func TestHandleList_ValidStatus_CallsService(t *testing.T) {
	mockSvc := new(MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	expectedStatus := constants.ReservationStatusCancelled
	expectedScope := "all"
	mockSvc.On("List", mock.Anything, mock.MatchedBy(func(q types.ReservationListQuery) bool {
		return q.Status != nil && *q.Status == expectedStatus && q.Scope != nil && *q.Scope == expectedScope
	}), "user-1", auth.RoleSuperAdmin).Return(&types.ReservationListResponse{
		Reservations: []types.ReservationListItem{},
		Pagination:   types.Pagination{Page: 1, PerPage: 25, TotalItems: 0, TotalPages: 0},
	}, nil)

	req := httptest.NewRequest(http.MethodGet, "/reservations?status=CANCELLED&scope=all", nil)
	req = withUserContext(req, "user-1", auth.RoleSuperAdmin)
	rec := httptest.NewRecorder()

	h.HandleList(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	mockSvc.AssertExpectations(t)
}

func TestHandleUpdate_InvalidStatus_ReturnsBadRequest(t *testing.T) {
	mockSvc := new(MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	badStatus := "INVALID_STATUS"
	cmd := types.UpdateReservationCommand{
		Status: &badStatus,
	}
	body, _ := json.Marshal(cmd)

	req := httptest.NewRequest(http.MethodPatch, "/reservations/res-1", bytes.NewReader(body))
	req.SetPathValue("id", "res-1")
	req = withUserContext(req, "user-1", auth.RoleUser)
	rec := httptest.NewRecorder()

	h.HandleUpdate(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	mockSvc.AssertNotCalled(t, "Update")
}

func TestHandleBulkUpdate_InvalidStatus_ReturnsBadRequest(t *testing.T) {
	mockSvc := new(MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	cmd := types.BulkUpdateReservationsCommand{
		ReservationIDs: []string{"res-1", "res-2"},
		Status:         "INVALID_STATUS",
	}
	body, _ := json.Marshal(cmd)

	req := httptest.NewRequest(http.MethodPost, "/reservations/bulk-status", bytes.NewReader(body))
	req = withUserContext(req, "admin-1", auth.RoleAdmin)
	rec := httptest.NewRecorder()

	h.HandleBulkUpdate(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	mockSvc.AssertNotCalled(t, "BulkUpdate")
}
