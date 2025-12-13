package auth

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
)

func TestRequireRoles(t *testing.T) {
	t.Run("returns 401 when profile not in context", func(t *testing.T) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
		})

		middleware := RequireRoles("admin")(next)
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.False(t, nextCalled, "Next handler should not be called")
		assert.Contains(t, w.Body.String(), "Unauthorized")
	})

	t.Run("returns 500 when context value is wrong type", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})
		middleware := RequireRoles("admin")(next)

		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		// Put wrong type in context
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, "wrong-type-string")
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusInternalServerError, w.Code)
		assert.Contains(t, w.Body.String(), "Internal Server Error")
	})

	t.Run("returns 403 when user has insufficient permissions", func(t *testing.T) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
		})
		middleware := RequireRoles("admin", "super_admin")(next)

		profile := &types.PublicProfilesSelect{
			Id:        "user-123",
			Role:      "user",
			IsEnabled: true,
		}
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.False(t, nextCalled, "Next handler should not be called")
		assert.Contains(t, w.Body.String(), "Forbidden")
	})

	t.Run("allows admin through", func(t *testing.T) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
			w.WriteHeader(http.StatusOK)
		})
		middleware := RequireRoles("admin", "super_admin")(next)

		profile := &types.PublicProfilesSelect{
			Id:        "admin-123",
			Role:      "admin",
			IsEnabled: true,
		}
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.True(t, nextCalled, "Next handler should be called")
	})

	t.Run("allows super_admin through", func(t *testing.T) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
			w.WriteHeader(http.StatusOK)
		})
		middleware := RequireRoles("admin", "super_admin")(next)

		profile := &types.PublicProfilesSelect{
			Id:        "superadmin-123",
			Role:      "super_admin",
			IsEnabled: true,
		}
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.True(t, nextCalled, "Next handler should be called")
	})

	t.Run("allows user role on user-only endpoint", func(t *testing.T) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
			w.WriteHeader(http.StatusOK)
		})
		middleware := RequireRoles("user")(next)

		profile := &types.PublicProfilesSelect{
			Id:        "user-123",
			Role:      "user",
			IsEnabled: true,
		}
		req := httptest.NewRequest(http.MethodGet, "/user-resource", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.True(t, nextCalled, "Next handler should be called")
	})

	t.Run("works with multiple allowed roles", func(t *testing.T) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
			w.WriteHeader(http.StatusOK)
		})
		middleware := RequireRoles("user", "admin", "super_admin")(next)

		profile := &types.PublicProfilesSelect{
			Id:        "user-123",
			Role:      "user",
			IsEnabled: true,
		}
		req := httptest.NewRequest(http.MethodGet, "/any-resource", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.True(t, nextCalled, "Next handler should be called")
	})

	t.Run("case insensitive role matching", func(t *testing.T) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
			w.WriteHeader(http.StatusOK)
		})
		middleware := RequireRoles("ADMIN")(next)

		profile := &types.PublicProfilesSelect{
			Id:        "admin-123",
			Role:      "admin", // lowercase in DB
			IsEnabled: true,
		}
		req := httptest.NewRequest(http.MethodGet, "/admin", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.True(t, nextCalled, "Next handler should be called with case insensitive match")
	})
}

func TestRequireRoles_EdgeCases(t *testing.T) {
	t.Run("empty roles list denies access", func(t *testing.T) {
		nextCalled := false
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			nextCalled = true
		})
		middleware := RequireRoles()(next) // No roles specified

		profile := &types.PublicProfilesSelect{
			Id:        "admin-123",
			Role:      "admin",
			IsEnabled: true,
		}
		req := httptest.NewRequest(http.MethodGet, "/any", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusForbidden, w.Code)
		assert.False(t, nextCalled, "Next handler should not be called when no roles are allowed")
	})

	t.Run("passes request through on success", func(t *testing.T) {
		var receivedRequest *http.Request
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			receivedRequest = r
			w.Header().Set("Content-Type", "application/json")
			_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
		})
		middleware := RequireRoles("admin")(next)

		profile := &types.PublicProfilesSelect{
			Id:        "admin-123",
			Role:      "admin",
			IsEnabled: true,
		}
		req := httptest.NewRequest(http.MethodGet, "/admin/resource?foo=bar", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserProfileContextKey, profile)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.NotNil(t, receivedRequest)
		assert.Equal(t, "/admin/resource", receivedRequest.URL.Path)
		assert.Equal(t, "bar", receivedRequest.URL.Query().Get("foo"))
	})
}
