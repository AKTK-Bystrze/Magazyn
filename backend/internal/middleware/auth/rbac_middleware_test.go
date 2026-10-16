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
	tests := []struct {
		name         string
		profileVal   any
		allowedRoles []string
		wantCode     int
		wantNext     bool
	}{
		{
			name:         "returns 401 when profile not in context",
			profileVal:   nil,
			allowedRoles: []string{"admin"},
			wantCode:     http.StatusUnauthorized,
			wantNext:     false,
		},
		{
			name:         "returns 500 when context value is wrong type",
			profileVal:   "wrong-type-string",
			allowedRoles: []string{"admin"},
			wantCode:     http.StatusInternalServerError,
			wantNext:     false,
		},
		{
			name:         "returns 403 when user has insufficient permissions",
			profileVal:   &types.PublicProfilesSelect{ID: "user-123", Role: "user", IsEnabled: true},
			allowedRoles: []string{"admin", "super_admin"},
			wantCode:     http.StatusForbidden,
			wantNext:     false,
		},
		{
			name:         "allows admin through",
			profileVal:   &types.PublicProfilesSelect{ID: "admin-123", Role: "admin", IsEnabled: true},
			allowedRoles: []string{"admin", "super_admin"},
			wantCode:     http.StatusOK,
			wantNext:     true,
		},
		{
			name:         "allows super_admin through",
			profileVal:   &types.PublicProfilesSelect{ID: "superadmin-123", Role: "super_admin", IsEnabled: true},
			allowedRoles: []string{"admin", "super_admin"},
			wantCode:     http.StatusOK,
			wantNext:     true,
		},
		{
			name:         "allows user role on user-only endpoint",
			profileVal:   &types.PublicProfilesSelect{ID: "user-123", Role: "user", IsEnabled: true},
			allowedRoles: []string{"user"},
			wantCode:     http.StatusOK,
			wantNext:     true,
		},
		{
			name:         "works with multiple allowed roles",
			profileVal:   &types.PublicProfilesSelect{ID: "user-123", Role: "user", IsEnabled: true},
			allowedRoles: []string{"user", "admin", "super_admin"},
			wantCode:     http.StatusOK,
			wantNext:     true,
		},
		{
			name:         "case insensitive role matching",
			profileVal:   &types.PublicProfilesSelect{ID: "admin-123", Role: "admin", IsEnabled: true},
			allowedRoles: []string{"ADMIN"},
			wantCode:     http.StatusOK,
			wantNext:     true,
		},
		{
			name:         "empty roles list denies access",
			profileVal:   &types.PublicProfilesSelect{ID: "admin-123", Role: "admin", IsEnabled: true},
			allowedRoles: nil,
			wantCode:     http.StatusForbidden,
			wantNext:     false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusOK)
			})
			middleware := RequireRoles(tt.allowedRoles...)(next)
			req := httptest.NewRequest(http.MethodGet, "/resource", nil)
			if tt.profileVal != nil {
				req = req.WithContext(context.WithValue(req.Context(), appcontext.UserProfileContextKey, tt.profileVal))
			}
			w := httptest.NewRecorder()
			middleware.ServeHTTP(w, req)
			assert.Equal(t, tt.wantCode, w.Code)
			assert.Equal(t, tt.wantNext, nextCalled)
		})
	}
}

func TestRequireRoles_PassesRequestThrough(t *testing.T) {
	var receivedRequest *http.Request
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedRequest = r
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})
	middleware := RequireRoles("admin")(next)
	profile := &types.PublicProfilesSelect{
		ID:        "admin-123",
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
}
