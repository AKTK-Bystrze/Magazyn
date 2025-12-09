package middleware

import (
	"context"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service"
	model "magazyn/backend/internal/types"
	"net/http"
	"strings"
)

// NewAuthMiddleware creates an authentication middleware that validates JWT tokens and enforces user authentication.
// It verifies the Bearer token from the Authorization header, fetches the user's profile with RLS enforcement,
// and populates the request context with user and profile information for downstream handlers.
// Disabled users are blocked from accessing all endpoints except /auth/session.
func NewAuthMiddleware(auth service.AuthClient, db service.PostgrestClient) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				logger.Warn(r.Context(), "Authorization header required but missing")
				http.Error(w, "Authorization header required", http.StatusUnauthorized)
				return
			}

			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || parts[0] != "Bearer" {
				logger.Warnf(r.Context(), "Invalid authorization header format - parts: %d, prefix: %s", len(parts), parts[0])
				http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
				return
			}

			token := parts[1]

			user, err := auth.WithToken(token).GetUser()
			if err != nil {
				logger.Errorf(r.Context(), "Token verification failed: %v", err)
				http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
				return
			}

			var profiles []model.PublicProfilesSelect
			_, err = db.WithUserToken(token).From("profiles").Select("*", "exact", false).Eq("id", user.ID.String()).ExecuteTo(&profiles)

			if err != nil {
				logger.Errorf(r.Context(), "Failed to fetch profile: %v", err)
			}

			ctx := context.WithValue(r.Context(), appcontext.UserContextKey, user)

			if err == nil && len(profiles) > 0 {
				profile := &profiles[0]

				if !profile.IsEnabled && r.URL.Path != "/auth/session" {
					logger.Warnf(r.Context(), "Access denied for disabled user: %s (%s) accessing %s", profile.Username, profile.Email, r.URL.Path)
					http.Error(w, "Account is disabled. Please contact an administrator.", http.StatusForbidden)
					return
				}

				ctx = context.WithValue(ctx, appcontext.UserProfileContextKey, profile)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
