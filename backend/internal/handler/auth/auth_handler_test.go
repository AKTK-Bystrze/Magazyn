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

func TestHandleLogout_Success(t *testing.T) {
	h, mockService := createTestHandler()
	token := "valid.token"
	mockService.On("Logout", mock.Anything, token).Return(nil)
	req := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	h.HandleLogout(w, req)
	assert.Equal(t, http.StatusOK, w.Code)
	mockService.AssertExpectations(t)
}

func TestHandleGetSession(t *testing.T) {
	userID := uuid.New()
	user := &types.User{ID: userID.String(), Email: "user@example.com"}
	tests := []struct {
		name     string
		mockRet  *types.SessionResponse
		mockErr  error
		wantCode int
	}{
		{
			name:     "Success",
			mockRet:  &types.SessionResponse{UserID: userID.String(), Email: "user@example.com", Username: "testuser"},
			wantCode: http.StatusOK,
		},
		{
			name:     "ProfileNotFound",
			mockErr:  types.NewNotFoundError("Profile", userID.String()),
			wantCode: http.StatusNotFound,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, mockService := createTestHandler()
			mockService.On("GetSession", mock.Anything, userID.String(), mock.Anything).Return(tt.mockRet, tt.mockErr)
			req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
			req.Header.Set("Authorization", "Bearer test-token")
			req = req.WithContext(context.WithValue(req.Context(), appcontext.UserContextKey, user))
			w := httptest.NewRecorder()
			h.HandleGetSession(w, req)
			assert.Equal(t, tt.wantCode, w.Code)
			mockService.AssertExpectations(t)
		})
	}
}
