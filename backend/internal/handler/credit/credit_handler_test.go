package credit

import (
	"context"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/types"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockCreditHistoryService is a mock implementation of CreditHistoryService
type MockCreditHistoryService struct {
	mock.Mock
}

func (m *MockCreditHistoryService) GetCreditHistory(ctx context.Context, query types.GetCreditHistoryQuery, requestingUserID string) (*types.CreditHistoryResponse, error) {
	args := m.Called(ctx, query, requestingUserID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.CreditHistoryResponse), args.Error(1)
}

func TestHandleGetCreditHistory(t *testing.T) {
	tests := []struct {
		name           string
		user           *types.User
		profile        *types.PublicProfilesSelect
		queryParams    map[string]string
		setupMock      func(*MockCreditHistoryService)
		expectedStatus int
		expectedBody   string // Partial match or specific error code
	}{
		{
			name: "Success - Regular User Own History",
			user: &types.User{ID: "user-123"},
			profile: &types.PublicProfilesSelect{
				Id:   "user-123",
				Role: auth.RoleUser,
			},
			queryParams: map[string]string{},
			setupMock: func(m *MockCreditHistoryService) {
				m.On("GetCreditHistory", mock.Anything, types.GetCreditHistoryQuery{
					Page:    1,
					PerPage: 25,
					UserID:  nil,
				}, "user-123").Return(&types.CreditHistoryResponse{
					CurrentBalance: 100,
					Pagination:     types.Pagination{Page: 1, PerPage: 25, TotalItems: 0, TotalPages: 0},
					CreditHistory:  []types.CreditHistoryItemDTO{},
				}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Success - Admin Filter by User",
			user: &types.User{ID: "admin-123"},
			profile: &types.PublicProfilesSelect{
				Id:   "admin-123",
				Role: auth.RoleAdmin,
			},
			queryParams: map[string]string{
				"user_id": "target-user-456",
			},
			setupMock: func(m *MockCreditHistoryService) {
				targetID := "target-user-456"
				m.On("GetCreditHistory", mock.Anything, types.GetCreditHistoryQuery{
					Page:    1,
					PerPage: 25,
					UserID:  &targetID,
				}, "admin-123").Return(&types.CreditHistoryResponse{
					CurrentBalance: 50,
					Pagination:     types.Pagination{Page: 1, PerPage: 25},
					CreditHistory:  []types.CreditHistoryItemDTO{},
				}, nil)
			},
			expectedStatus: http.StatusOK,
		},
		{
			name: "Forbidden - Regular User Try Filter",
			user: &types.User{ID: "user-123"},
			profile: &types.PublicProfilesSelect{
				Id:   "user-123",
				Role: auth.RoleUser,
			},
			queryParams: map[string]string{
				"user_id": "other-user",
			},
			setupMock:      func(m *MockCreditHistoryService) {},
			expectedStatus: http.StatusForbidden,
		},
		{
			name:           "Unauthorized - No User Context",
			user:           nil,
			profile:        nil,
			queryParams:    map[string]string{},
			setupMock:      func(m *MockCreditHistoryService) {},
			expectedStatus: http.StatusUnauthorized,
		},
		{
			name: "Bad Request - Invalid Page",
			user: &types.User{ID: "user-123"},
			profile: &types.PublicProfilesSelect{
				Id:   "user-123",
				Role: auth.RoleUser,
			},
			queryParams: map[string]string{
				"page": "invalid",
			},
			setupMock:      func(m *MockCreditHistoryService) {},
			expectedStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			// Setup
			mockService := new(MockCreditHistoryService)
			tc.setupMock(mockService)
			handler := NewCreditHistoryHandler(mockService)

			// Create Request
			req := httptest.NewRequest("GET", "/credit-history", nil)
			
			// Add Query Params
			q := req.URL.Query()
			for k, v := range tc.queryParams {
				q.Add(k, v)
			}
			req.URL.RawQuery = q.Encode()

			// Add Context
			ctx := req.Context()
			if tc.user != nil {
				ctx = context.WithValue(ctx, appcontext.UserContextKey, tc.user)
			}
			if tc.profile != nil {
				ctx = context.WithValue(ctx, appcontext.UserProfileContextKey, tc.profile)
			}
			req = req.WithContext(ctx)

			// Execute
			w := httptest.NewRecorder()
			handler.HandleGetCreditHistory(w, req)

			// Assert
			assert.Equal(t, tc.expectedStatus, w.Code)
			mockService.AssertExpectations(t)
		})
	}
}
