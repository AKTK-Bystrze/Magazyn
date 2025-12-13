package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// AuthRepository defines the interface for authentication and user profile access
type AuthRepository interface {
	// SendMagicLink sends a magic link to the specified email
	SendMagicLink(ctx context.Context, email string) error

	// Logout invalidates the user's session
	Logout(ctx context.Context, token string) error

	// GetUser validates the token and returns the user identity
	GetUser(ctx context.Context, token string) (*types.User, error)

	// VerifyOTP verifies the OTP and returns the session
	VerifyOTP(ctx context.Context, email, token string, otpType string) (*types.Session, error)

	// GetProfile retrieves the user's profile using their token (RLS)
	GetProfile(ctx context.Context, userID string, token string) (*types.PublicProfilesSelect, error)
}
