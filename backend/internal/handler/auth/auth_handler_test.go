package auth_test

import (
	"bytes"
	"context"
	"encoding/json"
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

// Helper to create handler with mock service
func createTestHandler() (*auth.AuthHandler, *serviceMocks.MockAuthService) {
	mockService := new(serviceMocks.MockAuthService)
	h := auth.NewAuthHandler(mockService)
	return h, mockService
}

func TestHandleLogin_Success(t *testing.T) {
	h, mockService := createTestHandler()
	email := "test@example.com"

	mockService.On("Login", mock.Anything, email).Return(&types.LoginResponse{}, nil)

	req := httptest.NewRequest(http.MethodPost, "/auth/login",
		bytes.NewBufferString(`{"email": "test@example.com"}`))
	w := httptest.NewRecorder()

	h.HandleLogin(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp types.LoginResponse
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "Login link sent to your email", resp.Message)

	mockService.AssertExpectations(t)
}

func TestHandleLogin_ServiceError(t *testing.T) {
	h, mockService := createTestHandler()
	email := "fail@example.com"

	mockService.On("Login", mock.Anything, email).Return(nil, errors.New("login failed"))

	req := httptest.NewRequest(http.MethodPost, "/auth/login",
		bytes.NewBufferString(`{"email": "fail@example.com"}`))
	w := httptest.NewRecorder()

	h.HandleLogin(w, req)

	assert.Equal(t, http.StatusInternalServerError, w.Code)

	mockService.AssertExpectations(t)
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

func TestHandleGetSession_Success(t *testing.T) {
	h, mockService := createTestHandler()

	userID := uuid.New()
	user := &types.User{ID: userID.String(), Email: "user@example.com"}

	expectedSession := &types.SessionResponse{
		UserID:   userID.String(),
		Email:    "user@example.com",
		Username: "testuser",
	}

	mockService.On("GetSession", mock.Anything, userID.String(), mock.Anything).Return(expectedSession, nil)

	req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	// Inject user into context (simulating middleware)
	ctx := context.WithValue(req.Context(), appcontext.UserContextKey, user)
	req = req.WithContext(ctx)

	w := httptest.NewRecorder()

	h.HandleGetSession(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp types.SessionResponse
	err := json.NewDecoder(w.Body).Decode(&resp)
	assert.NoError(t, err)
	assert.Equal(t, "testuser", resp.Username)

	mockService.AssertExpectations(t)
}

// Validation tests for request body parsing
func TestHandleLogin_Validation(t *testing.T) {
	h, _ := createTestHandler() // Mock not needed for validation early exits

	// Note: HTTP method validation (405 for GET) is now handled by the Go 1.22+ router
	// with route patterns like "POST /auth/login", so we don't test it at handler level

	t.Run("returns 400 for invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString("invalid"))
		w := httptest.NewRecorder()
		h.HandleLogin(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns 400 for empty email", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewBufferString(`{"email": ""}`))
		w := httptest.NewRecorder()
		h.HandleLogin(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
}
