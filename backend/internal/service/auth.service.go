package service

import (
	"context"
	"fmt"
	"magazyn/backend/internal/logger"
	model "magazyn/backend/internal/types"
	"time"

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

func (s *AuthService) Login(ctx context.Context, email string) error {
	err := s.auth.OTP(types.OTPRequest{
		Email:      email,
		CreateUser: true,
	})
	if err != nil {
		logger.Errorf(ctx, "Failed to send magic link to %s: %v", email, err)
		return fmt.Errorf("failed to send magic link: %w", err)
	}
	
	return nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	err := s.auth.WithToken(token).Logout()
	if err != nil {
		logger.Errorf(ctx, "Logout failed: %v", err)
		return fmt.Errorf("failed to logout: %w", err)
	}
	
	return nil
}

// getProfileByUserId fetches a user profile from the database by user ID
func (s *AuthService) getProfileByUserId(ctx context.Context, userId string) (*model.PublicProfilesSelect, error) {
	var profiles []model.PublicProfilesSelect
	_, err := s.db.From("profiles").Select("*", "exact", false).Eq("id", userId).ExecuteTo(&profiles)
	
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch profile for user %s: %v", userId, err)
		return nil, fmt.Errorf("failed to fetch profile: %w", err)
	}
	
	if len(profiles) == 0 {
		logger.Warnf(ctx, "Profile not found for user %s", userId)
		return nil, model.ErrProfileNotFound
	}
	
	return &profiles[0], nil
}

func (s *AuthService) GetSession(ctx context.Context, userId string) (*SessionResponse, error) {
	profile, err := s.getProfileByUserId(ctx, userId)
	if err != nil {
		return nil, err
	}

	// Session expires 2 hours from now (per PRD requirement 3.1.4)
	expiresAt := time.Now().Add(2 * time.Hour).Format(time.RFC3339)

	response := &SessionResponse{
		UserId:        profile.Id,
		Email:         profile.Email,
		Username:      profile.Username,
		Role:          profile.Role,
		CreditBalance: profile.CreditBalance,
		IsEnabled:     profile.IsEnabled,
		ExpiresAt:     expiresAt,
	}

	return response, nil
}
