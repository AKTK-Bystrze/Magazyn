// Package common provides shared HTTP helper functions for response formatting, context extraction, and error mapping.
package common

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
)

// Sentinel errors for authentication header parsing.
var (
	ErrAuthHeaderRequired = errors.New("authorization header required")
	ErrInvalidAuthHeader  = errors.New("invalid authorization header format")
)

// ExtractBearerToken extracts the bearer token from the Authorization header of the request.
func ExtractBearerToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", ErrAuthHeaderRequired
	}
	prefix, token, ok := strings.Cut(authHeader, " ")
	if !ok || prefix != "Bearer" || token == "" {
		return "", ErrInvalidAuthHeader
	}
	return token, nil
}

// RespondJSON marshals data as JSON and writes it to the response writer with the specified status code.
func RespondJSON(ctx context.Context, w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		logger.Errorf(ctx, "Failed to encode JSON response: %v", err)
	}
}

// RespondError writes a standard JSON error response envelope.
func RespondError(ctx context.Context, w http.ResponseWriter, status int, message string) {
	RespondJSON(ctx, w, status, map[string]string{"error": message})
}

// RespondWithError inspects domain error types and maps them to appropriate HTTP status codes and JSON envelopes.
func RespondWithError(ctx context.Context, w http.ResponseWriter, err error) {
	if err == nil {
		return
	}
	status := http.StatusInternalServerError
	var message string
	var details interface{}
	code := "INTERNAL_ERROR"
	var notFoundErr *types.NotFoundError
	var conflictErr *types.ConflictError
	var validationErr *types.ValidationError
	var forbiddenErr *types.ForbiddenError
	var internalErr *types.InternalError

	switch {
	case errors.As(err, &notFoundErr):
		status = http.StatusNotFound
		message, details, code = notFoundErr.Message, notFoundErr.Details, notFoundErr.Code
	case errors.As(err, &conflictErr):
		status = http.StatusConflict
		message, details, code = conflictErr.Message, conflictErr.Details, conflictErr.Code
	case errors.As(err, &validationErr):
		status = http.StatusBadRequest
		message, details, code = validationErr.Message, validationErr.Details, validationErr.Code
	case errors.As(err, &forbiddenErr):
		status = http.StatusForbidden
		message, details, code = forbiddenErr.Message, forbiddenErr.Details, forbiddenErr.Code
	case errors.As(err, &internalErr):
		message, details, code = internalErr.Message, internalErr.Details, internalErr.Code
	default:
		message = err.Error()
	}
	RespondJSON(ctx, w, status, map[string]interface{}{
		"error":   message,
		"code":    code,
		"details": details,
	})
}

// RespondUnauthorized writes a 401 Unauthorized JSON error envelope.
func RespondUnauthorized(ctx context.Context, w http.ResponseWriter) {
	RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
}

// GetUserIDFromContext extracts the authenticated user ID from the request context.
func GetUserIDFromContext(r *http.Request) string {
	if u := GetUserFromContext(r); u != nil {
		return u.ID
	}
	return ""
}

// GetUserFromContext extracts the authenticated User struct from the request context.
func GetUserFromContext(r *http.Request) *types.User {
	val := r.Context().Value(appcontext.UserContextKey)
	if val == nil {
		return nil
	}
	if u, ok := val.(*types.User); ok {
		return u
	}
	return nil
}

// GetAccessTokenFromContext extracts the Bearer token from the request context.
func GetAccessTokenFromContext(r *http.Request) string {
	if token, ok := r.Context().Value(appcontext.AccessTokenContextKey).(string); ok {
		return token
	}
	return ""
}

// GetUserProfileFromContext extracts the user profile from the request context.
func GetUserProfileFromContext(r *http.Request) *types.PublicProfilesSelect {
	val := r.Context().Value(appcontext.UserProfileContextKey)
	if val == nil {
		return nil
	}
	if p, ok := val.(*types.PublicProfilesSelect); ok {
		return p
	}
	return nil
}

// GetUserRoleFromContext extracts the authenticated user's role from the request context.
func GetUserRoleFromContext(r *http.Request) string {
	p := GetUserProfileFromContext(r)
	if p == nil {
		return ""
	}
	return p.Role
}

// ParsePagination extracts and validates page and per_page parameters from the request query string.
func ParsePagination(r *http.Request, defaultPage, defaultPerPage int) (int, int) {
	page := defaultPage
	if p, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil && p > 0 {
		page = p
	}
	perPage := defaultPerPage
	if pp, err := strconv.Atoi(r.URL.Query().Get("per_page")); err == nil && pp > 0 {
		perPage = pp
	}
	return page, perPage
}
