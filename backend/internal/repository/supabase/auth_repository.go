package supabase

import (
	"context"
	"encoding/json"
	"fmt"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	gotruetypes "github.com/supabase-community/gotrue-go/types"
	"github.com/supabase-community/supabase-go"
)

type authRepository struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

// NewAuthRepository creates a new Supabase implementation of AuthRepository
func NewAuthRepository(client *supabase.Client, url string, key string) repository.AuthRepository {
	return &authRepository{
		client:      client,
		supabaseURL: url,
		supabaseKey: key,
	}
}

// SendMagicLink sends a magic link to the specified email
func (r *authRepository) SendMagicLink(ctx context.Context, email string) error {
	return r.client.Auth.OTP(gotruetypes.OTPRequest{
		Email:      email,
		CreateUser: true,
	})
}

// VerifyOTP verifies the OTP and returns the session
func (r *authRepository) VerifyOTP(ctx context.Context, email, token string, otpType string) (*types.Session, error) {
	resp, err := r.client.Auth.VerifyForUser(gotruetypes.VerifyForUserRequest{
		Email: email,
		Token: token,
		Type:  gotruetypes.VerificationType(otpType),
	})
	if err != nil {
		return nil, err
	}

	return &types.Session{
		AccessToken: resp.AccessToken,
		User: types.User{
			ID:    resp.User.ID.String(),
			Email: resp.User.Email,
		},
	}, nil
}

// Logout invalidates the user's session
func (r *authRepository) Logout(ctx context.Context, token string) error {
	return r.client.Auth.WithToken(token).Logout()
}

// GetUser validates the token and returns the user identity
func (r *authRepository) GetUser(ctx context.Context, token string) (*types.User, error) {
	resp, err := r.client.Auth.WithToken(token).GetUser()
	if err != nil {
		return nil, err
	}

	return &types.User{
		ID:    resp.ID.String(),
		Email: resp.Email,
	}, nil
}

// GetProfile retrieves the user's profile using their token (RLS)
func (r *authRepository) GetProfile(ctx context.Context, userID string, token string) (*types.PublicProfilesSelect, error) {
	// Create a new client with the user's token to enforce RLS
	// This mirrors the logic previously in service/adapters.go
	clientWithAuth, err := supabase.NewClient(
		r.supabaseURL,
		r.supabaseKey,
		&supabase.ClientOptions{
			Headers: map[string]string{
				"Authorization": "Bearer " + token,
			},
		},
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create authenticated client: %w", err)
	}

	data, _, err := clientWithAuth.From("profiles").
		Select("*", "exact", false).
		Eq("id", userID).
		Execute()

	if err != nil {
		return nil, err
	}

	var profiles []types.PublicProfilesSelect
	if err := json.Unmarshal(data, &profiles); err != nil {
		return nil, err
	}

	if len(profiles) == 0 {
		return nil, types.NewNotFoundError("Profile", userID)
	}

	return &profiles[0], nil
}
