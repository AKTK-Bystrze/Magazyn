package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

// TestAuthMiddleware_HeaderValidation tests the header validation logic in AuthMiddleware
// These tests can run without Supabase because they fail before reaching Supabase calls
func TestAuthMiddleware_HeaderValidation(t *testing.T) {
	t.Run("returns 401 when Authorization header missing", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})

		middleware := AuthMiddleware(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Authorization header required")
	})

	t.Run("returns 401 when header format is invalid - wrong prefix", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})

		middleware := AuthMiddleware(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Basic sometoken")
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid authorization header format")
	})

	t.Run("returns 401 when header format is invalid - no space", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})

		middleware := AuthMiddleware(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearertoken")
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid authorization header format")
	})

	t.Run("returns 401 for Bearer without token", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})

		middleware := AuthMiddleware(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer")
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("returns 401 for empty Authorization header", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})

		middleware := AuthMiddleware(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "")
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Authorization header required")
	})

	t.Run("returns 401 for multiple spaces in header", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})

		middleware := AuthMiddleware(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer token with spaces")
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		// The Split will result in more than 2 parts
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("returns 401 for lowercase bearer prefix", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})

		middleware := AuthMiddleware(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "bearer sometoken")
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		// Current implementation requires exactly "Bearer" (case sensitive)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid authorization header format")
	})
}

func TestMin(t *testing.T) {
	t.Run("returns first when smaller", func(t *testing.T) {
		assert.Equal(t, 5, min(5, 10))
	})

	t.Run("returns second when smaller", func(t *testing.T) {
		assert.Equal(t, 3, min(10, 3))
	})

	t.Run("returns value when equal", func(t *testing.T) {
		assert.Equal(t, 7, min(7, 7))
	})

	t.Run("handles negative numbers", func(t *testing.T) {
		assert.Equal(t, -5, min(-5, 10))
		assert.Equal(t, -10, min(-5, -10))
	})

	t.Run("handles zero", func(t *testing.T) {
		assert.Equal(t, 0, min(0, 5))
		assert.Equal(t, 0, min(5, 0))
		assert.Equal(t, 0, min(0, 0))
	})

	t.Run("handles large numbers", func(t *testing.T) {
		assert.Equal(t, 1000000, min(1000000, 1000001))
		assert.Equal(t, 999999, min(1000000, 999999))
	})
}
