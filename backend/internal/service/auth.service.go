package service

import (
	"context"
	"errors"
	"fmt"
	"magazyn/backend/internal/config"
	"magazyn/backend/internal/logger"
	model "magazyn/backend/internal/types"

	"github.com/supabase-community/gotrue-go/types"
)

type AuthService struct{}

func NewAuthService() *AuthService {
	return &AuthService{}
}

func (s *AuthService) Login(email string) error {
	logger.Info(nil, fmt.Sprintf("Login attempt for email: %s", email))
	
	// Send magic link via OTP
	err := config.SupabaseClient.Auth.OTP(types.OTPRequest{
		Email:      email,
		CreateUser: false, // Don't auto-create users on login
	})
	if err != nil {
		logger.Error(nil, fmt.Sprintf("Failed to send magic link to %s: %v", email, err))
		return fmt.Errorf("failed to send magic link: %w", err)
	}
	
	logger.Info(nil, fmt.Sprintf("Magic link sent successfully to: %s", email))
	return nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	logger.Info(ctx, "Logout request received")
	
	// Invalidate session - need to set the token on the client first
	err := config.SupabaseClient.Auth.WithToken(token).Logout()
	if err != nil {
		logger.Error(ctx, fmt.Sprintf("Logout failed: %v", err))
		return fmt.Errorf("failed to logout: %w", err)
	}
	
	logger.Info(ctx, "User logged out successfully")
	return nil
}

func (s *AuthService) GetSession(ctx context.Context, userId string) (*SessionResponse, error) {
	logger.Info(ctx, "Fetching session information")
	
	// 1. Fetch user metadata from Supabase Auth (optional, if we need email/metadata not in profile)
	// For now, we rely on the profile in our database which should be synced.
	// However, the plan says "Fetches basic user info from Supabase".
	// Let's get the user from Supabase to get the email if it's not in the profile or to be sure.
	// Actually, the middleware already fetched the user. We could pass it down, but the ID is enough to query the profile.

	// 2. Query profiles table
	// We use Postgrest to get the profile
	var profiles []model.PublicProfilesSelect
	_, err := config.SupabaseClient.From("profiles").Select("*", "exact", false).Eq("id", userId).ExecuteTo(&profiles)

	if err != nil {
		logger.Error(ctx, fmt.Sprintf("Failed to fetch profile for user %s: %v", userId, err))
		return nil, fmt.Errorf("failed to fetch profile: %w", err)
	}

	if len(profiles) == 0 {
		logger.Warn(ctx, fmt.Sprintf("Profile not found for user %s", userId))
		return nil, errors.New("profile not found")
	}

	profile := profiles[0]
	logger.Debug(ctx, fmt.Sprintf("Session fetched for user: %s", profile.Username))

	// 3. Construct response
	// Note: ExpiresAt is usually part of the session/token, not the user profile.
	// Since we are just returning profile data here, we might leave ExpiresAt empty or get it from the token claims if passed.
	// The plan says: "ExpiresAt: string".
	// The middleware validates the token. If we want to return when it expires, we need the token claims.
	// For now, let's leave it empty or set it if we have access to the session.
	// The current Supabase Go client might not easily expose the session expiry from the user object directly without the session object.
	// Let's focus on the profile data.

	response := &SessionResponse{
		UserId:        profile.Id,
		Email:         profile.Email,
		Username:      profile.Username,
		Role:          profile.Role,
		CreditBalance: profile.CreditBalance,
		// ExpiresAt: ... // We'd need the session object for this.
	}

	return response, nil
}
