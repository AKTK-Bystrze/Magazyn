package auth

import (
	"context"
	"time"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

// AuthService provides authentication and session management operations.
// It orchestrates interactions between the repository and domain logic.
type AuthService interface {
	Login(ctx context.Context, email string) (*types.LoginResponse, error)
	VerifyOTP(ctx context.Context, email, token string, otpType string) (*types.SessionResponse, error)
	Logout(ctx context.Context, accessToken string) error
	GetSession(ctx context.Context, userID string, userToken string) (*types.SessionResponse, error)
}

type authService struct {
	repo repository.AuthRepository
}

// NewAuthService creates a new instance of AuthService
func NewAuthService(repo repository.AuthRepository) AuthService {
	// Assuming supabaseURL and apiKey would be passed in or configured elsewhere
	// For now, initializing with empty strings as they are not provided in the context
	return &authService{
		repo: repo,
	}
}

// Login initiates the magic link login flow for the given email
func (s *authService) Login(ctx context.Context, email string) (*types.LoginResponse, error) {
	err := s.repo.SendMagicLink(ctx, email)
	if err != nil {
		return nil, err
	}
	return &types.LoginResponse{
		Message: "Magic link sent to your email",
	}, nil
}

// VerifyOTP verifies the OTP and returns the session
func (s *authService) VerifyOTP(ctx context.Context, email, token string, otpType string) (*types.SessionResponse, error) {
	session, err := s.repo.VerifyOTP(ctx, email, token, otpType)
	if err != nil {
		return nil, err
	}

	// 1. Get Profile (RLS enforced by repo using userToken)
	// Assuming session.User.ID is the userId and session.AccessToken is the userToken
	profile, err := s.repo.GetProfile(ctx, session.User.ID, session.AccessToken)
	if err != nil {
		return nil, err
	}

	// 2. Construct Session Response using types.SessionResponse
	// Calculate explicit expiry (e.g., 2 hours from now as per policy) or rely on token expiry client-side.
	// We'll set it to 2 hours for now.
	expiresAt := time.Now().Add(2 * time.Hour).Format(time.RFC3339)

	return &types.SessionResponse{
		UserID:        session.User.ID,
		Email:         session.User.Email,
		Username:      profile.Username,
		Role:          string(profile.Role),
		CreditBalance: profile.CreditBalance,
		IsEnabled:     profile.IsEnabled,
		ExpiresAt:     expiresAt, // User-friendly expiry time
	}, nil
}

// Logout invalidates the user's session
func (s *authService) Logout(ctx context.Context, accessToken string) error {
	return s.repo.Logout(ctx, accessToken)
}

// GetSession retrieves the current user's session details including profile information
func (s *authService) GetSession(ctx context.Context, userID string, userToken string) (*types.SessionResponse, error) {
	// 1. Get Profile (RLS enforced by repo using userToken)
	profile, err := s.repo.GetProfile(ctx, userID, userToken)
	if err != nil {
		return nil, err
	}

	// 2. Construct Session Response using types.SessionResponse
	// Calculate explicit expiry (e.g., 2 hours from now as per policy) or rely on token expiry client-side.
	// We'll set it to 2 hours for now.
	expiresAt := time.Now().Add(2 * time.Hour).Format(time.RFC3339)

	response := &types.SessionResponse{
		UserID:        profile.ID,
		Email:         profile.Email,
		Username:      profile.Username,
		Role:          profile.Role,
		CreditBalance: profile.CreditBalance,
		IsEnabled:     profile.IsEnabled,
		ExpiresAt:     expiresAt,
	}

	return response, nil
}
