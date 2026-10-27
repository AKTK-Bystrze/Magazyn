package auth_test

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/handler/auth"
	"magazyn/backend/internal/testutils"
	serviceMocks "magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func createTestHandler() (*auth.AuthHandler, *serviceMocks.MockAuthService) {
	mockService := new(serviceMocks.MockAuthService)
	h := auth.NewAuthHandler(mockService)
	return h, mockService
}
func TestHandleLogin(t *testing.T) {
	tests := []struct {
		name     string
		body     string
		mockSvc  func(m *serviceMocks.MockAuthService)
		wantCode int
	}{
		{
			name: "Success",
			body: `{"email": "test@example.com"}`,
			mockSvc: func(m *serviceMocks.MockAuthService) {
				m.On("Login", mock.Anything, "test@example.com").Return(&types.LoginResponse{}, nil)
			},
			wantCode: http.StatusOK,
		},
		{
			name: "ServiceError",
			body: `{"email": "fail@example.com"}`,
			mockSvc: func(m *serviceMocks.MockAuthService) {
				m.On("Login", mock.Anything, "fail@example.com").Return(nil, errors.New("login failed"))
			},
			wantCode: http.StatusInternalServerError,
		},
		{
			name:     "InvalidJSON",
			body:     "invalid",
			wantCode: http.StatusBadRequest,
		},
		{
			name:     "EmptyEmail",
			body:     `{"email": ""}`,
			wantCode: http.StatusBadRequest,
		},
		{
			name: "ValidationError_SignupsNotAllowed",
			body: `{"email": "unregistered@example.com"}`,
			mockSvc: func(m *serviceMocks.MockAuthService) {
				m.On("Login", mock.Anything, "unregistered@example.com").Return(nil, types.NewValidationError("Signups not allowed", nil))
			},
			wantCode: http.StatusUnprocessableEntity,
		},
		{
			name: "ValidationError_General",
			body: `{"email": "invalid-format"}`,
			mockSvc: func(m *serviceMocks.MockAuthService) {
				m.On("Login", mock.Anything, "invalid-format").Return(nil, types.NewValidationError("Invalid email address", nil))
			},
			wantCode: http.StatusBadRequest,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, mockService := createTestHandler()
			if tt.mockSvc != nil {
				tt.mockSvc(mockService)
			}
			req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(tt.body))
			w := httptest.NewRecorder()
			h.HandleLogin(w, req)
			assert.Equal(t, tt.wantCode, w.Code)
			mockService.AssertExpectations(t)
		})
	}
}

func TestHandleLogout(t *testing.T) {
	t.Run("Success_WithAuthorizationHeader", func(t *testing.T) {
		h, mockService := createTestHandler()
		token := "valid.token"
		mockService.On("Logout", mock.Anything, token).Return(nil)
		req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		h.HandleLogout(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		mockService.AssertExpectations(t)
	})

	t.Run("Success_WithContextToken", func(t *testing.T) {
		h, mockService := createTestHandler()
		token := "context.token.123"
		mockService.On("Logout", mock.Anything, token).Return(nil)
		req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
		ctx := context.WithValue(req.Context(), appcontext.AccessTokenContextKey, token)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()
		h.HandleLogout(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		mockService.AssertExpectations(t)
	})

	t.Run("Unauthorized_MissingToken", func(t *testing.T) {
		h, mockService := createTestHandler()
		req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
		w := httptest.NewRecorder()
		h.HandleLogout(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		mockService.AssertNotCalled(t, "Logout", mock.Anything, mock.Anything)
	})

	t.Run("InternalServerError_ServiceFailure", func(t *testing.T) {
		h, mockService := createTestHandler()
		token := "failing.token"
		mockService.On("Logout", mock.Anything, token).Return(errors.New("logout error"))
		req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
		req.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		h.HandleLogout(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		mockService.AssertExpectations(t)
	})
}

func TestHandleGetSession(t *testing.T) {
	userID := uuid.New()

	t.Run("Success_WithAuthorizationHeader", func(t *testing.T) {
		h, mockService := createTestHandler()
		mockRet := &types.SessionResponse{UserID: userID.String(), Email: "user@example.com", Username: "testuser"}
		mockService.On("GetSession", mock.Anything, userID.String(), "test-token").Return(mockRet, nil)
		req := testutils.NewAuthenticatedRequest(http.MethodGet, "/auth/session", nil, userID.String(), "")
		req.Header.Set("Authorization", "Bearer test-token")
		w := httptest.NewRecorder()
		h.HandleGetSession(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		mockService.AssertExpectations(t)
	})

	t.Run("Success_WithContextToken", func(t *testing.T) {
		h, mockService := createTestHandler()
		mockRet := &types.SessionResponse{UserID: userID.String(), Email: "user@example.com", Username: "testuser"}
		mockService.On("GetSession", mock.Anything, userID.String(), "ctx-token-456").Return(mockRet, nil)
		req := testutils.NewAuthenticatedRequest(http.MethodGet, "/auth/session", nil, userID.String(), "")
		ctx := context.WithValue(req.Context(), appcontext.AccessTokenContextKey, "ctx-token-456")
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()
		h.HandleGetSession(w, req)
		assert.Equal(t, http.StatusOK, w.Code)
		mockService.AssertExpectations(t)
	})

	t.Run("Unauthorized_MissingUser", func(t *testing.T) {
		h, mockService := createTestHandler()
		req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
		req.Header.Set("Authorization", "Bearer some-token")
		w := httptest.NewRecorder()
		h.HandleGetSession(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		mockService.AssertNotCalled(t, "GetSession", mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("Unauthorized_MissingToken", func(t *testing.T) {
		h, mockService := createTestHandler()
		req := testutils.NewAuthenticatedRequest(http.MethodGet, "/auth/session", nil, userID.String(), "")
		w := httptest.NewRecorder()
		h.HandleGetSession(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		mockService.AssertNotCalled(t, "GetSession", mock.Anything, mock.Anything, mock.Anything)
	})

	t.Run("NotFound_ProfileNotFound", func(t *testing.T) {
		h, mockService := createTestHandler()
		mockErr := types.NewNotFoundError("Profile", userID.String())
		mockService.On("GetSession", mock.Anything, userID.String(), "test-token").Return(nil, mockErr)
		req := testutils.NewAuthenticatedRequest(http.MethodGet, "/auth/session", nil, userID.String(), "")
		req.Header.Set("Authorization", "Bearer test-token")
		w := httptest.NewRecorder()
		h.HandleGetSession(w, req)
		assert.Equal(t, http.StatusNotFound, w.Code)
		mockService.AssertExpectations(t)
	})

	t.Run("InternalServerError_ServiceFailure", func(t *testing.T) {
		h, mockService := createTestHandler()
		mockService.On("GetSession", mock.Anything, userID.String(), "test-token").Return(nil, errors.New("db connection lost"))
		req := testutils.NewAuthenticatedRequest(http.MethodGet, "/auth/session", nil, userID.String(), "")
		req.Header.Set("Authorization", "Bearer test-token")
		w := httptest.NewRecorder()
		h.HandleGetSession(w, req)
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		mockService.AssertExpectations(t)
	})
}
