package handler

import (
	"bytes"
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/service"

	"github.com/stretchr/testify/assert"
	gotrueTypes "github.com/supabase-community/gotrue-go/types"
)

// Stage 1 tests - validation logic that doesn't require Supabase

// Helper to create a handler with a real service (won't be called for validation tests)
func createTestHandler() *AuthHandler {
	return NewAuthHandler(service.NewAuthService())
}

func TestHandleLogin_Validation(t *testing.T) {
	handler := createTestHandler()

	t.Run("returns 405 for non-POST (GET)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/auth/login", nil)
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
		assert.Contains(t, w.Body.String(), "Method not allowed")
	})

	t.Run("returns 405 for non-POST (PUT)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/auth/login", nil)
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("returns 405 for non-POST (DELETE)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/auth/login", nil)
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("returns 400 for invalid JSON", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString("invalid json"))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid request body")
	})

	t.Run("returns 400 for empty request body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString(""))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns 400 for empty email", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString(`{"email": ""}`))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Email is required")
	})

	t.Run("returns 400 for missing email field", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString(`{}`))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Email is required")
	})

	t.Run("returns 400 for null email", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString(`{"email": null}`))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("returns 400 for whitespace-only email", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString(`{"email": "   "}`))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Email is required")
	})
}

func TestHandleLogout_Validation(t *testing.T) {
	handler := createTestHandler()

	t.Run("returns 405 for non-POST (GET)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/auth/logout", nil)
		w := httptest.NewRecorder()
		handler.HandleLogout(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
		assert.Contains(t, w.Body.String(), "Method not allowed")
	})

	t.Run("returns 405 for non-POST (PUT)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/auth/logout", nil)
		w := httptest.NewRecorder()
		handler.HandleLogout(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("returns 405 for non-POST (DELETE)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/auth/logout", nil)
		w := httptest.NewRecorder()
		handler.HandleLogout(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})
}

func TestHandleGetSession_Validation(t *testing.T) {
	handler := createTestHandler()

	t.Run("returns 405 for non-GET (POST)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/session", nil)
		w := httptest.NewRecorder()
		handler.HandleGetSession(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
		assert.Contains(t, w.Body.String(), "Method not allowed")
	})

	t.Run("returns 405 for non-GET (PUT)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPut, "/auth/session", nil)
		w := httptest.NewRecorder()
		handler.HandleGetSession(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("returns 405 for non-GET (DELETE)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodDelete, "/auth/session", nil)
		w := httptest.NewRecorder()
		handler.HandleGetSession(w, req)
		assert.Equal(t, http.StatusMethodNotAllowed, w.Code)
	})

	t.Run("returns 401 when user not in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
		w := httptest.NewRecorder()
		handler.HandleGetSession(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Unauthorized")
	})

	t.Run("returns 401 when user in context is nil", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserContextKey,
			(*gotrueTypes.User)(nil))
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()
		handler.HandleGetSession(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Unauthorized")
	})

	t.Run("returns 401 when context value is wrong type (string)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserContextKey, "wrong-type-string")
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()
		handler.HandleGetSession(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Unauthorized")
	})

	t.Run("returns 401 when context value is wrong type (int)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserContextKey, 12345)
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()
		handler.HandleGetSession(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})

	t.Run("returns 401 when context value is wrong type (map)", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
		ctx := context.WithValue(req.Context(), appcontext.UserContextKey,
			map[string]string{"id": "user-123"})
		req = req.WithContext(ctx)
		w := httptest.NewRecorder()
		handler.HandleGetSession(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

// Edge case tests
func TestHandleLogin_EdgeCases(t *testing.T) {
	handler := createTestHandler()

	t.Run("handles malformed JSON with extra fields gracefully", func(t *testing.T) {
		// Extra fields should be ignored
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString(`{"email": "", "extra": "field"}`))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		// Email is still empty, so should fail validation
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Email is required")
	})

	t.Run("handles nested JSON body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString(`{"email": {"nested": "value"}}`))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		// This should fail decoding since email expects string, not object
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("handles array in request body", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodPost, "/auth/login",
			bytes.NewBufferString(`[{"email": "test@example.com"}]`))
		w := httptest.NewRecorder()
		handler.HandleLogin(w, req)
		// Can't decode array into struct
		assert.Equal(t, http.StatusBadRequest, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid request body")
	})
}
