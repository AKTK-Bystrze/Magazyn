// Package service defines interfaces for authentication, database operations, and service implementations.
// These interfaces enable dependency injection and facilitate testing with mocks.
package service

import (
	"context"

	"magazyn/backend/internal/types"

	gotruetypes "github.com/supabase-community/gotrue-go/types"
)

// AuthClient defines the interface for Supabase Auth operations.
// It provides methods for OTP authentication and token-based operations.
type AuthClient interface {
	OTP(req gotruetypes.OTPRequest) error
	WithToken(token string) AuthClientWithToken
}

// AuthClientWithToken defines operations available with a user's JWT token.
// This interface is returned by AuthClient.WithToken and provides authenticated operations.
type AuthClientWithToken interface {
	Logout() error
	GetUser() (*gotruetypes.User, error)
}

// PostgrestClient defines the interface for Supabase database operations.
// It supports query building and RLS (Row Level Security) enforcement via user tokens.
type PostgrestClient interface {
	From(table string) PostgrestQueryBuilder
	WithUserToken(token string) PostgrestClient // Create client with user's JWT for RLS
}

// PostgrestQueryBuilder defines the interface for building database queries.
// It allows adding filters and executing queries with type-safe result binding.
type PostgrestQueryBuilder interface {
	Select(columns string, count string, head bool) PostgrestFilterBuilder
}

// PostgrestFilterBuilder defines the interface for filtering and executing queries.
// It allows adding filters and executing queries with type-safe result binding.
type PostgrestFilterBuilder interface {
	Eq(column string, value string) PostgrestFilterBuilder
	ExecuteTo(dest interface{}) (string, error)
}

// AuthServiceInterface defines the interface for authentication service operations.
// It provides login, logout, and session management functionality.
type AuthServiceInterface interface {
	Login(ctx context.Context, email string) (*types.LoginResponse, error)
	Logout(ctx context.Context, token string) error
	GetSession(ctx context.Context, userID string, userToken string) (*types.SessionResponse, error)
}
