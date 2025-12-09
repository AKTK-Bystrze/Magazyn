package auth

import (
	"magazyn/backend/internal/appcontext"
	authutil "magazyn/backend/internal/auth"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
	"net/http"
)

// RequireRoles creates a middleware that enforces role-based access control (RBAC).
// It checks if the authenticated user has one of the specified roles before allowing access.
// This middleware must be used after NewAuthMiddleware, which populates the user profile in the context.
// If the user profile is missing or the user lacks the required role, access is denied.
func RequireRoles(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			val := ctx.Value(appcontext.UserProfileContextKey)
			if val == nil {
				logger.Warn(ctx, "Access denied: User profile not found in context (Middleware order issue?)")
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}

			profile, ok := val.(*types.PublicProfilesSelect)
			if !ok {
				logger.Error(ctx, "Access denied: Failed to cast user identifier")
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				return
			}

			if !authutil.HasRole(profile, allowedRoles...) {
				logger.Warnf(ctx, "Access denied: User %s (Role: %s) attempted to access protected resource. Required: %v", profile.Id, profile.Role, allowedRoles)
				http.Error(w, "Forbidden: Insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
