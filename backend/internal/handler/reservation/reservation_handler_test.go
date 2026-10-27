package reservation_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	handler "magazyn/backend/internal/handler/reservation"
	"magazyn/backend/internal/testutils"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestHandleList_ValidationErrors(t *testing.T) {
	tests := []struct {
		name          string
		queryURL      string
		expectedError string
	}{
		{
			name:          "invalid status",
			queryURL:      "/reservations?status=INVALID_STATUS",
			expectedError: "Invalid reservation status",
		},
		{
			name:          "invalid scope",
			queryURL:      "/reservations?scope=unknown_scope",
			expectedError: "Invalid scope: must be 'all' or 'my'",
		},
		{
			name:          "invalid sort",
			queryURL:      "/reservations?sort=invalid_sort",
			expectedError: "Invalid sort option",
		},
		{
			name:          "search too long",
			queryURL:      "/reservations?search=" + strings.Repeat("a", constants.MaxSearchLength+1),
			expectedError: "Search term too long",
		},
		{
			name:          "invalid user_id",
			queryURL:      "/reservations?user_id=invalid-uuid",
			expectedError: "Invalid user_id format",
		},
		{
			name:          "invalid equipment_id",
			queryURL:      "/reservations?equipment_id=invalid-uuid",
			expectedError: "Invalid equipment_id format",
		},
		{
			name:          "invalid type_id",
			queryURL:      "/reservations?type_id=invalid-uuid",
			expectedError: "Invalid type_id format",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockSvc := new(mocks.MockReservationService)
			h := handler.NewReservationHandler(mockSvc)
			req := httptest.NewRequest(http.MethodGet, tt.queryURL, nil)
			req = testutils.WithUserContext(req, "user-1", auth.RoleUser)
			rec := httptest.NewRecorder()
			h.HandleList(rec, req)
			assert.Equal(t, http.StatusBadRequest, rec.Code)
			var resp map[string]string
			err := json.NewDecoder(rec.Body).Decode(&resp)
			assert.NoError(t, err)
			assert.Contains(t, resp["error"], tt.expectedError)
			mockSvc.AssertNotCalled(t, "List")
		})
	}
}

func TestHandleList_ValidStatus_CallsService(t *testing.T) {
	mockSvc := new(mocks.MockReservationService)
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
	req = testutils.WithUserContext(req, "user-1", auth.RoleSuperAdmin)
	rec := httptest.NewRecorder()

	h.HandleList(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	mockSvc.AssertExpectations(t)
}

func TestHandleUpdate_InvalidStatus_ReturnsBadRequest(t *testing.T) {
	mockSvc := new(mocks.MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	badStatus := "INVALID_STATUS"
	cmd := types.UpdateReservationCommand{
		Status: &badStatus,
	}
	body, _ := json.Marshal(cmd)

	req := httptest.NewRequest(http.MethodPatch, "/reservations/res-1", bytes.NewReader(body))
	req.SetPathValue("id", "res-1")
	req = testutils.WithUserContext(req, "user-1", auth.RoleUser)
	rec := httptest.NewRecorder()

	h.HandleUpdate(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	mockSvc.AssertNotCalled(t, "Update")
}

func TestHandleBulkUpdate_InvalidStatus_ReturnsBadRequest(t *testing.T) {
	mockSvc := new(mocks.MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	cmd := types.BulkUpdateReservationsCommand{
		ReservationIDs: []string{"res-1", "res-2"},
		Status:         "INVALID_STATUS",
	}
	body, _ := json.Marshal(cmd)

	req := httptest.NewRequest(http.MethodPost, "/reservations/bulk-status", bytes.NewReader(body))
	req = testutils.WithUserContext(req, "admin-1", auth.RoleAdmin)
	rec := httptest.NewRecorder()

	h.HandleBulkUpdate(rec, req)

	assert.Equal(t, http.StatusBadRequest, rec.Code)
	mockSvc.AssertNotCalled(t, "BulkUpdate")
}

func TestHandleList_AllFiltersValid_CallsService(t *testing.T) {
	mockSvc := new(mocks.MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	validUUID1 := "00000000-0000-0000-0000-000000000001"
	validUUID2 := "00000000-0000-0000-0000-000000000002"
	validUUID3 := "00000000-0000-0000-0000-000000000003"
	expectedSearch := "kajak"
	expectedSort := "start_date_asc"

	mockSvc.On("List", mock.Anything, mock.MatchedBy(func(q types.ReservationListQuery) bool {
		return q.UserID != nil && *q.UserID == validUUID1 &&
			q.EquipmentID != nil && *q.EquipmentID == validUUID2 &&
			q.TypeID != nil && *q.TypeID == validUUID3 &&
			q.Search != nil && *q.Search == expectedSearch &&
			q.Sort != nil && *q.Sort == expectedSort
	}), "user-1", auth.RoleUser).Return(&types.ReservationListResponse{
		Reservations: []types.ReservationListItem{},
		Pagination:   types.Pagination{Page: 1, PerPage: 25, TotalItems: 0, TotalPages: 0},
	}, nil)

	url := "/reservations?user_id=" + validUUID1 + "&equipment_id=" + validUUID2 + "&type_id=" + validUUID3 + "&search=" + expectedSearch + "&sort=" + expectedSort
	req := httptest.NewRequest(http.MethodGet, url, nil)
	req = testutils.WithUserContext(req, "user-1", auth.RoleUser)
	rec := httptest.NewRecorder()

	h.HandleList(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	mockSvc.AssertExpectations(t)
}

func TestHandleCreate_ConflictError_ReturnsConflict(t *testing.T) {
	mockSvc := new(mocks.MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: "eq-1",
				StartDate:   "2026-06-01",
				EndDate:     "2026-06-05",
			},
		},
	}
	body, err := json.Marshal(cmd)
	assert.NoError(t, err)

	conflictErr := types.NewConflictError("Equipment is already reserved for the selected period", nil)
	mockSvc.On("Create", mock.Anything, cmd, "user-1", auth.RoleUser).Return(nil, conflictErr)

	req := httptest.NewRequest(http.MethodPost, "/reservations", bytes.NewReader(body))
	req = testutils.WithUserContext(req, "user-1", auth.RoleUser)
	rec := httptest.NewRecorder()

	h.HandleCreate(rec, req)

	assert.Equal(t, http.StatusConflict, rec.Code)
	var resp map[string]interface{}
	decodeErr := json.NewDecoder(rec.Body).Decode(&resp)
	assert.NoError(t, decodeErr)
	assert.Equal(t, "Equipment is already reserved for the selected period", resp["error"])
	mockSvc.AssertExpectations(t)
}

func TestHandleUpdate_ConflictError_ReturnsConflict(t *testing.T) {
	mockSvc := new(mocks.MockReservationService)
	h := handler.NewReservationHandler(mockSvc)

	startDate := "2026-06-10"
	endDate := "2026-06-15"
	cmd := types.UpdateReservationCommand{
		StartDate: &startDate,
		EndDate:   &endDate,
	}
	body, err := json.Marshal(cmd)
	assert.NoError(t, err)

	conflictErr := types.NewConflictError("Dates not available", nil)
	mockSvc.On("Update", mock.Anything, "res-1", cmd, "user-1", auth.RoleUser).Return(nil, conflictErr)

	req := httptest.NewRequest(http.MethodPatch, "/reservations/res-1", bytes.NewReader(body))
	req.SetPathValue("id", "res-1")
	req = testutils.WithUserContext(req, "user-1", auth.RoleUser)
	rec := httptest.NewRecorder()

	h.HandleUpdate(rec, req)

	assert.Equal(t, http.StatusConflict, rec.Code)
	var resp map[string]interface{}
	decodeErr := json.NewDecoder(rec.Body).Decode(&resp)
	assert.NoError(t, decodeErr)
	assert.Equal(t, "Dates not available", resp["error"])
	mockSvc.AssertExpectations(t)
}

