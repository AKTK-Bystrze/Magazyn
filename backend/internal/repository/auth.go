// Package repository provides data access interfaces and implementations.
package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// AuthRepository defines the interface for authentication and user profile access
type AuthRepository interface {
	SendMagicLink(ctx context.Context, email string) error

	Logout(ctx context.Context, token string) error

	GetUser(ctx context.Context, token string) (*types.User, error)

	VerifyOTP(ctx context.Context, email, token string, otpType string) (*types.Session, error)

	CreateUser(ctx context.Context, email, password string) (*types.User, error)

	GetProfile(ctx context.Context, userID string, token string) (*types.PublicProfilesSelect, error)
}
