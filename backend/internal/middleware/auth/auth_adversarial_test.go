package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	serviceMocks "magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestAuthMiddleware_AdversarialHeaders(t *testing.T) {
	tests := []struct {
		name           string
		headerVal      *string // nil means omit header
		setupMock      func(*serviceMocks.MockAuthRepository)
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Missing Authorization Header",
			headerVal:      nil,
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Authorization header required",
		},
		{
			name:           "Empty Authorization Header",
			headerVal:      newString(""),
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Authorization header required",
		},
		{
			name:           "Lowercase bearer prefix",
			headerVal:      newString("bearer some-token"),
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Invalid authorization header format",
		},
		{
			name:           "Uppercase BEARER prefix",
			headerVal:      newString("BEARER some-token"),
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Invalid authorization header format",
		},
		{
			name:           "Bearer with no token",
			headerVal:      newString("Bearer"),
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Invalid authorization header format",
		},
		{
			name:           "Bearer with multiple spaces/parts",
			headerVal:      newString("Bearer part1 part2"),
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Invalid authorization header format",
		},
		{
			name:           "Basic auth header",
			headerVal:      newString("Basic dXNlcjpwYXNz"),
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Invalid authorization header format",
		},
		{
			name:      "Bearer with single empty token (Bearer + single space)",
			headerVal: newString("Bearer "),
			setupMock: func(m *serviceMocks.MockAuthRepository) {
				m.On("GetUser", mock.Anything, "").Return((*types.User)(nil), errors.New("empty token"))
			},
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Invalid or expired token",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			mockRepo := new(serviceMocks.MockAuthRepository)
			if tc.setupMock != nil {
				tc.setupMock(mockRepo)
			}

			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
			})

			handler := NewAuthMiddleware(mockRepo)(next)
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tc.headerVal != nil {
				req.Header.Set("Authorization", *tc.headerVal)
			}
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tc.expectedBody)
			mockRepo.AssertExpectations(t)
		})
	}
}

func TestRBACMiddleware_AdversarialContext(t *testing.T) {
	tests := []struct {
		name           string
		contextValue   interface{}
		requiredRoles  []string
		expectedStatus int
		expectedBody   string
	}{
		{
			name:           "Nil context value (missing profile)",
			contextValue:   nil,
			requiredRoles:  []string{"admin"},
			expectedStatus: http.StatusUnauthorized,
			expectedBody:   "Unauthorized",
		},
		{
			name:           "String value in context (type corruption)",
			contextValue:   "not-a-profile",
			requiredRoles:  []string{"admin"},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "Internal Server Error",
		},
		{
			name:           "Int value in context (type corruption)",
			contextValue:   42,
			requiredRoles:  []string{"admin"},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "Internal Server Error",
		},
		{
			name:           "User struct instead of Profile struct (type corruption)",
			contextValue:   &types.User{ID: "123", Email: "test@example.com"},
			requiredRoles:  []string{"admin"},
			expectedStatus: http.StatusInternalServerError,
			expectedBody:   "Internal Server Error",
		},
		{
			name: "Valid profile with non-matching role",
			contextValue: &types.PublicProfilesSelect{
				ID:        "user-1",
				Role:      "user",
				IsEnabled: true,
			},
			requiredRoles:  []string{"admin", "super_admin"},
			expectedStatus: http.StatusForbidden,
			expectedBody:   "Forbidden",
		},
		{
			name: "Valid profile with matching role",
			contextValue: &types.PublicProfilesSelect{
				ID:        "admin-1",
				Role:      "admin",
				IsEnabled: true,
			},
			requiredRoles:  []string{"admin", "super_admin"},
			expectedStatus: http.StatusOK,
			expectedBody:   "ok",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.WriteHeader(http.StatusOK)
				_, _ = w.Write([]byte("ok"))
			})

			handler := RequireRoles(tc.requiredRoles...)(next)
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tc.contextValue != nil {
				ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, tc.contextValue)
				req = req.WithContext(ctx)
			}
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, req)

			assert.Equal(t, tc.expectedStatus, w.Code)
			assert.Contains(t, w.Body.String(), tc.expectedBody)
		})
	}
}

func newString(s string) *string {
	return &s
}
