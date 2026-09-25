package common

import (
	"context"
	"encoding/json"
	"errors"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
	"net/http"
	"strconv"
	"strings"
)

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
func RespondJSON(ctx context.Context, w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		logger.Errorf(ctx, "Failed to encode JSON response: %v", err)
	}
}
func RespondError(ctx context.Context, w http.ResponseWriter, status int, message string) {
	RespondJSON(ctx, w, status, map[string]string{"error": message})
}
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
func RespondUnauthorized(ctx context.Context, w http.ResponseWriter) {
	RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
}
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
func GetUserRoleFromContext(r *http.Request) string {
	p := GetUserProfileFromContext(r)
	if p == nil {
		return ""
	}
	return p.Role
}
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
