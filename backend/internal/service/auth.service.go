package service

import (
	"context"
	"fmt"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	model "magazyn/backend/internal/types"
	"time"

	"github.com/supabase-community/gotrue-go/types"
)

// AuthService provides authentication operations including login, logout, and session management.
// It uses the AuthClient for authentication operations and PostgrestClient for database queries with RLS enforcement.
type AuthService struct {
	auth AuthClient
	db   PostgrestClient
}

// NewAuthService creates a new AuthService with the provided auth and database clients.
func NewAuthService(auth AuthClient, db PostgrestClient) *AuthService {
	return &AuthService{
		auth: auth,
		db:   db,
	}
}

// Login initiates the magic link authentication flow.
// It sends an OTP (one-time password) link to the specified email address.
// If the user doesn't exist, a new user account is created automatically.
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

// Logout invalidates the user's current session.
// It requires a valid JWT token to identify and terminate the session.
func (s *AuthService) Logout(ctx context.Context, token string) error {
	err := s.auth.WithToken(token).Logout()
	if err != nil {
		logger.Errorf(ctx, "Logout failed: %v", err)
		return fmt.Errorf("failed to logout: %w", err)
	}

	return nil
}

// getProfileByUserId fetches a user profile from the database using the user's JWT token.
// This enforces Row Level Security (RLS) policies, ensuring users can only access their own profile data.
// Returns ErrProfileNotFound if no profile exists for the given user ID.
func (s *AuthService) getProfileByUserId(ctx context.Context, userId string, userToken string) (*model.PublicProfilesSelect, error) {
	var profiles []model.PublicProfilesSelect
	_, err := s.db.WithUserToken(userToken).From("profiles").Select("*", "exact", false).Eq("id", userId).ExecuteTo(&profiles)

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

// GetSession retrieves the complete session information for an authenticated user.
// It fetches the user's profile and constructs a session response with user details and expiration time.
// The session expires after the duration specified in constants.SessionExpiryDuration (2 hours per PRD 3.1.4).
func (s *AuthService) GetSession(ctx context.Context, userId string, userToken string) (*SessionResponse, error) {
	profile, err := s.getProfileByUserId(ctx, userId, userToken)
	if err != nil {
		return nil, err
	}

	// Session expires based on configured duration (per PRD requirement 3.1.4)
	expiresAt := time.Now().Add(constants.SessionExpiryDuration).Format(time.RFC3339)

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
