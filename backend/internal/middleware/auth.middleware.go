package middleware

import (
	"context"
	"magazyn/backend/internal/config"
	model "magazyn/backend/internal/types"
	"net/http"
	"strings"
)

type ContextKey string

const UserContextKey ContextKey = "user"
const UserProfileContextKey ContextKey = "user_profile"

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		token := parts[1]

		// Verify token with Supabase
		// We use the Auth client to get the user from the token
		user, err := config.SupabaseClient.Auth.WithToken(token).GetUser()
		if err != nil {
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		// Fetch user profile from database to get username
		var profiles []model.PublicProfilesSelect
		_, err = config.SupabaseClient.From("profiles").Select("*", "exact", false).Eq("id", user.ID.String()).ExecuteTo(&profiles)
		
		ctx := context.WithValue(r.Context(), UserContextKey, user)
		
		// Add profile to context if found (for logger to access username)
		if err == nil && len(profiles) > 0 {
			ctx = context.WithValue(ctx, UserProfileContextKey, &profiles[0])
		}
		
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
