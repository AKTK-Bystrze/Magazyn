package middleware

import (
	"context"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/config"
	"magazyn/backend/internal/logger"
	model "magazyn/backend/internal/types"
	"net/http"
	"strings"

	"github.com/supabase-community/gotrue-go/types"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		logger.Infof(r.Context(), "🔐 AuthMiddleware: Processing %s %s", r.Method, r.URL.Path)
		
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			logger.Warn(r.Context(), "❌ Authorization header required but missing")
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		logger.Infof(r.Context(), "📋 Authorization header present (length: %d)", len(authHeader))

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			logger.Warnf(r.Context(), "❌ Invalid authorization header format - parts: %d, prefix: %s", len(parts), parts[0])
			http.Error(w, "Invalid authorization header format", http.StatusUnauthorized)
			return
		}

		token := parts[1]
		logger.Infof(r.Context(), "🎫 Token extracted (length: %d, prefix: %s...)", len(token), token[:min(20, len(token))])

		// Verify token with Supabase
		// We use the Auth client to get the user from the token
		logger.Info(r.Context(), "🔍 Verifying token with Supabase...")
		user, err := config.SupabaseClient.Auth.WithToken(token).GetUser()
		if err != nil {
			logger.Errorf(r.Context(), "❌ Token verification failed: %v", err)
			logger.Warnf(r.Context(), "   Token (first 20 chars): %s...", token[:min(20, len(token))])
			http.Error(w, "Invalid or expired token", http.StatusUnauthorized)
			return
		}

		logger.Infof(r.Context(), "✅ Token verified successfully - User ID: %s, Email: %s", user.ID.String(), user.Email)

		// Fetch user profile from database to get username and check if enabled
		logger.Infof(r.Context(), "🔍 Fetching user profile from database for user ID: %s", user.ID.String())
		var profiles []model.PublicProfilesSelect
		_, err = config.SupabaseClient.From("profiles").Select("*", "exact", false).Eq("id", user.ID.String()).ExecuteTo(&profiles)
		
		if err != nil {
			logger.Errorf(r.Context(), "❌ Failed to fetch profile: %v", err)
		} else {
			logger.Infof(r.Context(), "📊 Profile query returned %d results", len(profiles))
		}
		

		// Explicitly check type compatibility with gotrue-go/types
		// This ensures that the type put into context matches what the handler expects
		var userCtx *types.User
		if u, ok := interface{}(user).(*types.User); ok {
			userCtx = u
			logger.Infof(r.Context(), "✅ User type matches gotrue-go/types.User")
		} else if resp, ok := interface{}(user).(*types.UserResponse); ok {
			userCtx = &resp.User
			logger.Infof(r.Context(), "✅ User type matches gotrue-go/types.UserResponse (extracted User)")
		} else {
			logger.Errorf(r.Context(), "❌ User type mismatch! Got: %T, Expected: *types.User or *types.UserResponse", user)
			// Proceed anyway but this will likely fail in handler
		}

		ctx := context.WithValue(r.Context(), appcontext.UserContextKey, userCtx)
		
		// Add profile to context if found (for logger to access username)
		if err == nil && len(profiles) > 0 {
			profile := &profiles[0]
			logger.Infof(r.Context(), "👤 Profile found - Username: %s, Email: %s, Enabled: %t", profile.Username, profile.Email, profile.IsEnabled)
			
			// Check if user is enabled (skip check for /auth/session endpoint)
			// Disabled users need to fetch their session info so the frontend can redirect them to /account-disabled
            logger.Infof(r.Context(), "🛡️ Explicitly checking isEnabled=%t for path=%s", profile.IsEnabled, r.URL.Path)
			if !profile.IsEnabled && r.URL.Path != "/auth/session" {
				logger.Warnf(r.Context(), "❌ Access denied for disabled user: %s (%s) accessing %s", profile.Username, profile.Email, r.URL.Path)
				http.Error(w, "Account is disabled. Please contact an administrator.", http.StatusForbidden)
				return
			}
			
			if !profile.IsEnabled {
				logger.Infof(r.Context(), "⚠️  Disabled user accessing /auth/session - allowing to fetch session info")
			}
			
			ctx = context.WithValue(ctx, appcontext.UserProfileContextKey, profile)
			logger.Info(r.Context(), "✅ Auth successful - proceeding to handler")
		} else {
			logger.Warn(r.Context(), "⚠️  No profile found but user authenticated - proceeding to handler")
		}
		
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
