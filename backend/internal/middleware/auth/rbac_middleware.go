package auth

import (
	"net/http"

	"magazyn/backend/internal/appcontext"
	authutil "magazyn/backend/internal/auth"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
)

// RequireRoles restricts access to requests whose authenticated profile has one of allowedRoles.
func RequireRoles(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()
			val := ctx.Value(appcontext.UserProfileContextKey)
			if val == nil {
				logger.Warn(ctx, "Access denied: User profile not found in context (Middleware order issue?)")
				common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
				return
			}
			profile, ok := val.(*types.PublicProfilesSelect)
			if !ok {
				logger.Error(ctx, "Access denied: Failed to cast user identifier")
				common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
				return
			}
			if !authutil.HasRole(profile, allowedRoles...) {
				logger.Warnf(ctx, "Access denied: User %s (Role: %s) attempted to access protected resource. Required: %v", profile.ID, profile.Role, allowedRoles)
				common.RespondError(ctx, w, http.StatusForbidden, "Forbidden: Insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
