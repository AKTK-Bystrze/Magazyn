// Package handler provides HTTP request handlers and utility functions for the API.
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

// ExtractBearerToken extracts the JWT token from the Authorization header.
// It expects the header format: "Bearer <token>"
// Returns an error if the header is missing or malformed.
func ExtractBearerToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", errors.New("authorization header required")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", errors.New("invalid authorization header format")
	}

	return parts[1], nil
}

// RespondJSON sends a JSON response with the given status code and data.
// It sets the Content-Type header to application/json and logs any encoding errors.
func RespondJSON(ctx context.Context, w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		logger.Errorf(ctx, "Failed to encode JSON response: %v", err)
	}
}

// RespondError sends a JSON error response with the given status code and message.
// It's a convenience wrapper around RespondJSON for error responses.
func RespondError(ctx context.Context, w http.ResponseWriter, status int, message string) {
	RespondJSON(ctx, w, status, map[string]string{"error": message})
}

// RespondWithError maps an error type to an appropriate HTTP status code and sends it.
func RespondWithError(ctx context.Context, w http.ResponseWriter, err error) {
	if err == nil {
		return
	}

	status := http.StatusInternalServerError
	var message string
	var details interface{}
	code := "INTERNAL_ERROR"

	// Check if it's one of our custom error types
	switch e := err.(type) {
	case *types.NotFoundError:
		status = http.StatusNotFound
		message = e.Message
		details = e.Details
		code = e.Code
	case *types.ConflictError:
		status = http.StatusConflict
		message = e.Message
		details = e.Details
		code = e.Code
	case *types.ValidationError:
		status = http.StatusBadRequest
		message = e.Message
		details = e.Details
		code = e.Code
	case *types.ForbiddenError:
		status = http.StatusForbidden
		message = e.Message
		details = e.Details
		code = e.Code
	case *types.InternalError:
		status = http.StatusInternalServerError
		message = e.Message
		details = e.Details
		code = e.Code
	default:
		// Generic error
		message = err.Error()
	}

	RespondJSON(ctx, w, status, map[string]interface{}{
		"error":   message,
		"code":    code,
		"details": details,
	})
}

// RespondUnauthorized sends a JSON error response with status 401 Unauthorized.
func RespondUnauthorized(ctx context.Context, w http.ResponseWriter) {
	RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
}

// GetUserIDFromContext extracts the authenticated user's ID from the request context.
// Returns empty string if user is not authenticated or context key is missing.
func GetUserIDFromContext(r *http.Request) string {
	val := r.Context().Value(appcontext.UserContextKey)
	if val == nil {
		return ""
	}
	if u, ok := val.(*types.User); ok {
		return u.ID
	}
	return ""
}

// GetUserFromContext extracts the authenticated user from the request context.
// Returns nil if user is not authenticated or context key is missing.
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

// GetUserProfileFromContext extracts the user profile from the request context.
// Returns nil if profile is not available or context key is missing.
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

// GetUserRoleFromContext extracts the user's role from the profile in the request context.
// Returns empty string if profile is not available.
func GetUserRoleFromContext(r *http.Request) string {
	p := GetUserProfileFromContext(r)
	if p == nil {
		return ""
	}
	return p.Role
}

// ParsePagination extracts page and per_page from query parameters.
// Returns (page, perPage) with default values if not provided or invalid.
// Defaults are defined in constants package, but here we fallback to provided defaults if 0.
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
