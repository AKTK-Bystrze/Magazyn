package common_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/handler/common"

	"github.com/stretchr/testify/assert"
)

func TestExtractTokenOrContext(t *testing.T) {
	t.Run("returns token from context if present", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		ctx := context.WithValue(req.Context(), appcontext.AccessTokenContextKey, "context-token-123")
		req = req.WithContext(ctx)

		token, err := common.ExtractTokenOrContext(req)
		assert.NoError(t, err)
		assert.Equal(t, "context-token-123", token)
	})

	t.Run("trims surrounding whitespace from context token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		ctx := context.WithValue(req.Context(), appcontext.AccessTokenContextKey, "   context-token-123   ")
		req = req.WithContext(ctx)

		token, err := common.ExtractTokenOrContext(req)
		assert.NoError(t, err)
		assert.Equal(t, "context-token-123", token)
	})

	t.Run("falls back to header when context token contains only whitespace", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		ctx := context.WithValue(req.Context(), appcontext.AccessTokenContextKey, "    ")
		req = req.WithContext(ctx)
		req.Header.Set("Authorization", "Bearer header-token-from-fallback")

		token, err := common.ExtractTokenOrContext(req)
		assert.NoError(t, err)
		assert.Equal(t, "header-token-from-fallback", token)
	})

	t.Run("falls back to Authorization header when not in context", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer header-token-456")

		token, err := common.ExtractTokenOrContext(req)
		assert.NoError(t, err)
		assert.Equal(t, "header-token-456", token)
	})

	t.Run("returns ErrAuthHeaderRequired when token missing from both", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)

		token, err := common.ExtractTokenOrContext(req)
		assert.ErrorIs(t, err, common.ErrAuthHeaderRequired)
		assert.Empty(t, token)
	})

	t.Run("returns ErrInvalidAuthHeader when Authorization header is malformed", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Basic dXNlcjpwYXNz")

		token, err := common.ExtractTokenOrContext(req)
		assert.ErrorIs(t, err, common.ErrInvalidAuthHeader)
		assert.Empty(t, token)
	})

	t.Run("returns ErrInvalidAuthHeader when Authorization header is Bearer with only whitespace", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer    ")

		token, err := common.ExtractTokenOrContext(req)
		assert.ErrorIs(t, err, common.ErrInvalidAuthHeader)
		assert.Empty(t, token)
	})

	t.Run("returns ErrInvalidAuthHeader when Authorization header is Bearer without token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer")

		token, err := common.ExtractTokenOrContext(req)
		assert.ErrorIs(t, err, common.ErrInvalidAuthHeader)
		assert.Empty(t, token)
	})

	t.Run("trims surrounding whitespace from bearer token", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/test", nil)
		req.Header.Set("Authorization", "Bearer   valid-token-789   ")

		token, err := common.ExtractTokenOrContext(req)
		assert.NoError(t, err)
		assert.Equal(t, "valid-token-789", token)
	})
}
