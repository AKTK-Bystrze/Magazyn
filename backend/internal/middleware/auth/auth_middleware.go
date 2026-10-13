// Package auth provides authentication and authorization middleware for HTTP handlers.
package auth

import (
	"context"
	"net/http"
	"strings"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
)

// NewAuthMiddleware creates HTTP middleware that verifies bearer tokens and populates request context.
func NewAuthMiddleware(repo repository.AuthRepository) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				logger.Warn(r.Context(), "Authorization header required but missing")
				common.RespondError(r.Context(), w, http.StatusUnauthorized, "Authorization header required")
				return
			}
			logger.Debugf(r.Context(), "Auth Middleware: Received Header len=%d", len(authHeader))
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				logger.Warnf(r.Context(), "Invalid authorization header format - parts: %d, prefix: %s", len(parts), parts[0])
				common.RespondError(r.Context(), w, http.StatusUnauthorized, "Invalid authorization header format")
				return
			}
			token := parts[1]
			user, err := repo.GetUser(r.Context(), token)
			if err != nil {
				logger.Errorf(r.Context(), "Token verification failed: %v", err)
				common.RespondError(r.Context(), w, http.StatusUnauthorized, "Invalid or expired token")
				return
			}
			profile, err := repo.GetProfile(r.Context(), user.ID, token)
			if err != nil {
				logger.Errorf(r.Context(), "Failed to fetch profile: %v", err)
			}
			ctx := context.WithValue(r.Context(), appcontext.UserContextKey, user)
			ctx = context.WithValue(ctx, appcontext.AccessTokenContextKey, token)
			if profile != nil {
				if !profile.IsEnabled && r.URL.Path != "/auth/session" {
					logger.Warnf(r.Context(), "Access denied for disabled user: %s (%s) accessing %s", profile.Username, profile.Email, r.URL.Path)
					common.RespondError(r.Context(), w, http.StatusForbidden, "Account is disabled. Please contact an administrator.")
					return
				}
				ctx = context.WithValue(ctx, appcontext.UserProfileContextKey, profile)
			}
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
