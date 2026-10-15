package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/handler/common"
	serviceMocks "magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

func TestExtractBearerToken_EmpiricalStress(t *testing.T) {
	tests := []struct {
		name          string
		authHeader    string
		expectError   bool
		expectedErr   string
		expectedToken string
	}{
		{
			name:        "missing header",
			authHeader:  "",
			expectError: true,
			expectedErr: "authorization header required",
		},
		{
			name:          "standard valid token",
			authHeader:    "Bearer sample_test_token_123",
			expectError:   false,
			expectedToken: "sample_test_token_123",
		},
		{
			name:        "prefix only, no space",
			authHeader:  "Bearer",
			expectError: true,
			expectedErr: "invalid authorization header format",
		},
		{
			name:          "prefix with single space but empty token",
			authHeader:    "Bearer ",
			expectError:   false, // strings.Split produces ["Bearer", ""]
			expectedToken: "",
		},
		{
			name:        "prefix with double space and token",
			authHeader:  "Bearer  token123",
			expectError: true, // strings.Split produces ["Bearer", "", "token123"]
			expectedErr: "invalid authorization header format",
		},
		{
			name:        "token with embedded spaces",
			authHeader:  "Bearer token part2",
			expectError: true,
			expectedErr: "invalid authorization header format",
		},
		{
			name:        "lowercase bearer",
			authHeader:  "bearer token123",
			expectError: true,
			expectedErr: "invalid authorization header format",
		},
		{
			name:        "basic auth format",
			authHeader:  "Basic dXNlcjpwYXNz",
			expectError: true,
			expectedErr: "invalid authorization header format",
		},
		{
			name:        "tab separated",
			authHeader:  "Bearer\ttoken123",
			expectError: true,
			expectedErr: "invalid authorization header format",
		},
		{
			name:        "arbitrary string",
			authHeader:  "RandomStringWithoutSpace",
			expectError: true,
			expectedErr: "invalid authorization header format",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			token, err := common.ExtractBearerToken(req)
			if tc.expectError {
				assert.Error(t, err)
				assert.Equal(t, tc.expectedErr, err.Error())
				assert.Empty(t, token)
			} else {
				assert.NoError(t, err)
				assert.Equal(t, tc.expectedToken, token)
			}
		})
	}
}

func TestAuthMiddleware_EmptyTokenHandling(t *testing.T) {
	mockRepo := new(serviceMocks.MockAuthRepository)
	mockRepo.On("GetUser", mock.Anything, "").Return((*types.User)(nil), assert.AnError)

	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
	})

	middleware := NewAuthMiddleware(mockRepo)(next)
	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("Authorization", "Bearer ")
	w := httptest.NewRecorder()

	middleware.ServeHTTP(w, req)
	assert.Equal(t, http.StatusUnauthorized, w.Code)
	assert.Contains(t, w.Body.String(), "Invalid or expired token")
	assert.False(t, nextCalled)
	mockRepo.AssertExpectations(t)
}

func TestRBACMiddleware_EmpiricalStress(t *testing.T) {
	t.Run("nil context profile produces 401 Unauthorized", func(t *testing.T) {
		middleware := RequireRoles("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		w := httptest.NewRecorder()
		middleware.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("corrupted context profile (int) produces 500 InternalServerError", func(t *testing.T) {
		middleware := RequireRoles("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, 12345)
		w := httptest.NewRecorder()
		middleware.ServeHTTP(w, req.WithContext(ctx))
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("corrupted context profile (wrong struct) produces 500 InternalServerError", func(t *testing.T) {
		middleware := RequireRoles("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, &types.User{ID: "not-a-profile"})
		w := httptest.NewRecorder()
		middleware.ServeHTTP(w, req.WithContext(ctx))
		assert.Equal(t, http.StatusInternalServerError, w.Code)
	})

	t.Run("valid profile with matching role proceeds", func(t *testing.T) {
		nextCalled := false
		middleware := RequireRoles("admin", "super_admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
			w.WriteHeader(http.StatusOK)
		}))
		profile := &types.PublicProfilesSelect{ID: "u1", Role: "admin", IsEnabled: true}
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		w := httptest.NewRecorder()
		middleware.ServeHTTP(w, req.WithContext(ctx))
		assert.Equal(t, http.StatusOK, w.Code)
		assert.True(t, nextCalled)
	})

	t.Run("valid profile with non-matching role produces 403 Forbidden", func(t *testing.T) {
		nextCalled := false
		middleware := RequireRoles("admin")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
		}))
		profile := &types.PublicProfilesSelect{ID: "u1", Role: "user", IsEnabled: true}
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		w := httptest.NewRecorder()
		middleware.ServeHTTP(w, req.WithContext(ctx))
		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.False(t, nextCalled)
	})
}
