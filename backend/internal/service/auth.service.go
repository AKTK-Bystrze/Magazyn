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
	err := s.auth.OTP(types.OTPRequest{
		Email:      email,
		CreateUser: true,
	})
	if err != nil {
		logger.Error(nil, fmt.Sprintf("Failed to send magic link to %s: %v", email, err))
		return fmt.Errorf("failed to send magic link: %w", err)
	}
	
	return nil
}

func (s *AuthService) Logout(ctx context.Context, token string) error {
	err := s.auth.WithToken(token).Logout()
	if err != nil {
		logger.Error(ctx, fmt.Sprintf("Logout failed: %v", err))
		return fmt.Errorf("failed to logout: %w", err)
	}
	
	return nil
}

func (s *AuthService) GetSession(ctx context.Context, userId string) (*SessionResponse, error) {
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
