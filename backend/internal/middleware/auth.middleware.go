package middleware

import (
	"context"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/config"
	"magazyn/backend/internal/logger"
	model "magazyn/backend/internal/types"
	"net/http"
	"strings"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			logger.Warn(r.Context(), "Authorization header required but missing")
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			logger.Warn(r.Context(), "Invalid authorization header format")
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		token := parts[1]

		// Verify token with Supabase
		// We use the Auth client to get the user from the token
		user, err := config.SupabaseClient.Auth.WithToken(token).GetUser()
		if err != nil {
			logger.Warnf(r.Context(), "Token verification failed: %v", err)
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Fetch user profile from database to get username
		var profiles []model.PublicProfilesSelect
		_, err = config.SupabaseClient.From("profiles").Select("*", "exact", false).Eq("id", user.ID.String()).ExecuteTo(&profiles)
		
		ctx := context.WithValue(r.Context(), appcontext.UserContextKey, user)
		
		// Add profile to context if found (for logger to access username)
		if err == nil && len(profiles) > 0 {
			ctx = context.WithValue(ctx, appcontext.UserProfileContextKey, &profiles[0])
		}
		
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
