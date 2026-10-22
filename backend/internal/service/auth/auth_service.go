package auth

import (
	"context"
	"time"

	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

type AuthService interface {
	Login(ctx context.Context, email string) (*types.LoginResponse, error)
	Logout(ctx context.Context, accessToken string) error
	GetSession(ctx context.Context, userID string, userToken string) (*types.SessionResponse, error)
}
type authService struct {
	repo repository.AuthRepository
}

func NewAuthService(repo repository.AuthRepository) AuthService {
	return &authService{
		repo: repo,
	}
}
func (s *authService) Login(ctx context.Context, email string) (*types.LoginResponse, error) {
	logger.Infof(ctx, "Initiating magic link login for: %s", email)
	err := s.repo.SendMagicLink(ctx, email)
	if err != nil {
		return nil, err
	}
	return &types.LoginResponse{
		Message: "Magic link sent to your email",
	}, nil
}
func (s *authService) Logout(ctx context.Context, accessToken string) error {
	logger.Infof(ctx, "Logging out user session")
	return s.repo.Logout(ctx, accessToken)
}
func (s *authService) GetSession(ctx context.Context, userID string, userToken string) (*types.SessionResponse, error) {
	logger.Infof(ctx, "Fetching session for user ID: %s", userID)
	profile, err := s.repo.GetProfile(ctx, userID, userToken)
	if err != nil {
		return nil, err
	}
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
