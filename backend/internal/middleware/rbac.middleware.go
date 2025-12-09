package middleware

import (
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
	"net/http"
)

// RequireRoles middleware ensures the user has one of the specified roles
func RequireRoles(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			// 1. Get user profile from context (populated by AuthMiddleware)
			val := ctx.Value(appcontext.UserProfileContextKey)
			if val == nil {
				logger.Warn(ctx, "Access denied: User profile not found in context (Middleware order issue?)")
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			// 2. Cast to Profile
			profile, ok := val.(*types.PublicProfilesSelect)
			if !ok {
				logger.Error(ctx, "Access denied: Failed to cast user identifier")
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}

			// 3. Check Role
			if !auth.HasRole(profile, allowedRoles...) {
				logger.Warnf(ctx, "Access denied: User %s (Role: %s) attempted to access protected resource. Required: %v", profile.Id, profile.Role, allowedRoles)
				http.Error(w, "Forbidden: Insufficient permissions", http.StatusForbidden)
				return
			}

			// 4. Proceed
			next.ServeHTTP(w, r)
		})
	}
}
