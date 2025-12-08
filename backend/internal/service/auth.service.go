package service

import (
	"context"
	"errors"
	"fmt"
	"magazyn/backend/internal/logger"
	model "magazyn/backend/internal/types"

	"github.com/supabase-community/gotrue-go/types"
)

type AuthService struct {
	auth AuthClient
	db   PostgrestClient
}

func NewAuthService(auth AuthClient, db PostgrestClient) *AuthService {
	return &AuthService{
		auth: auth,
		db:   db,
	}
}

func (s *AuthService) Login(email string) error {
	logger.Info(nil, fmt.Sprintf("Login attempt for email: %s", email))
	
	// Send magic link via OTP
	// CreateUser: true allows new users to be created via login page
	// New users are created as disabled by default (see handle_new_user trigger)
	// SuperAdmin must enable users before they can access the application
	err := s.auth.OTP(types.OTPRequest{
		Email:      email,
		CreateUser: true,
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
	err := s.auth.WithToken(token).Logout()
	if err != nil {
		logger.Error(ctx, fmt.Sprintf("Logout failed: %v", err))
		return fmt.Errorf("failed to logout: %w", err)
	}
	
	logger.Info(ctx, "User logged out successfully")
	return nil
}

func (s *AuthService) GetSession(ctx context.Context, userId string) (*SessionResponse, error) {
	logger.Info(ctx, "Fetching session information")
	
	// 2. Query profiles table
	// We use Postgrest to get the profile
	var profiles []model.PublicProfilesSelect
	_, err := s.db.From("profiles").Select("*", "exact", false).Eq("id", userId).ExecuteTo(&profiles)

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
	response := &SessionResponse{
		UserId:        profile.Id,
		Email:         profile.Email,
		Username:      profile.Username,
		Role:          profile.Role,
		CreditBalance: profile.CreditBalance,
		IsEnabled:     profile.IsEnabled,
	}

	return response, nil
}
