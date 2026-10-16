package testutils

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/types"
)

// StringPtr returns a pointer to the passed string value.
func StringPtr(s string) *string {
	return &s
}

// WithUserContext injects User and PublicProfilesSelect into request context.
func WithUserContext(r *http.Request, userID string, role string) *http.Request {
	ctx := context.WithValue(r.Context(), appcontext.UserContextKey, &types.User{ID: userID})
	ctx = context.WithValue(ctx, appcontext.UserProfileContextKey, &types.PublicProfilesSelect{ID: userID, Role: role})
	return r.WithContext(ctx)
}

// NewAuthenticatedRequest creates an http.Request with authenticated user and profile context.
func NewAuthenticatedRequest(method, url string, body io.Reader, userID, role string) *http.Request {
	req := httptest.NewRequest(method, url, body)
	return WithUserContext(req, userID, role)
}
