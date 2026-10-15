package auth_test

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/types"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestAuthHandler_GetSession_AdversarialErrors(t *testing.T) {
	userID := uuid.New().String()
	user := &types.User{ID: userID, Email: "user@example.com"}

	tests := []struct {
		name           string
		userInContext  *types.User
		authHeader     string
		mockError      error
		mockSession    *types.SessionResponse
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "User not in context",
			userInContext:  nil,
			authHeader:     "Bearer valid-token",
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Unauthorized",
		},
		{
			name:           "Missing Authorization header",
			userInContext:  user,
			authHeader:     "",
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "authorization header required",
		},
		{
			name:           "Malformed Authorization header (no Bearer prefix)",
			userInContext:  user,
			authHeader:     "Basic 12345",
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "invalid authorization header format",
		},
		{
			name:           "Profile Not Found (*types.NotFoundError direct)",
			userInContext:  user,
			authHeader:     "Bearer valid-token",
			mockError:      types.NewNotFoundError("Profile", userID),
			expectedStatus: http.StatusNotFound,
			expectedBody:   "Profile not found",
		},
		{
			name:           "Profile Not Found (wrapped with fmt.Errorf %w)",
			userInContext:  user,
			authHeader:     "Bearer valid-token",
			mockError:      fmt.Errorf("repository lookup failed: %w", types.NewNotFoundError("Profile", userID)),
			expectedStatus: http.StatusNotFound,
			expectedBody:   "Profile not found",
		},
		{
			name:           "Database internal error (*types.InternalError)",
			userInContext:  user,
			authHeader:     "Bearer valid-token",
			mockError:      types.NewInternalError("db timeout", nil),
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "Internal server error",
		},
		{
			name:           "Generic standard library error",
			userInContext:  user,
			authHeader:     "Bearer valid-token",
			mockError:      errors.New("unexpected network partition"),
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "Internal server error",
		},
		{
			name:          "Successful session retrieval",
			userInContext: user,
			authHeader:    "Bearer valid-token",
			mockSession: &types.SessionResponse{
				UserID:        userID,
				Email:         user.Email,
				Username:      "validuser",
				Role:          "user",
				CreditBalance: 100,
				IsEnabled:     true,
			},
			expectedStatus: http.StatusOK,
			expectedBody:   `"username":"validuser"`,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h, mockService := createTestHandler()

			if tc.mockError != nil || tc.mockSession != nil {
				mockService.On("GetSession", mock.Anything, userID, "valid-token").
					Return(tc.mockSession, tc.mockError).Once()
			}

			req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			if tc.userInContext != nil {
				ctx := context.WithValue(req.Context(), appcontext.UserContextKey, tc.userInContext)
				req = req.WithContext(ctx)
			}

			w := httptest.NewRecorder()
			h.HandleGetSession(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tc.expectedBody)
			mockService.AssertExpectations(t)
		})
	}
}
