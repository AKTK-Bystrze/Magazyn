package service

import (
	"context"

	"github.com/supabase-community/gotrue-go/types"
)

// AuthClient defines the interface for Supabase Auth operations
type AuthClient interface {
	OTP(req types.OTPRequest) error
	WithToken(token string) AuthClientWithToken
}

// AuthClientWithToken defines operations available with a user token
type AuthClientWithToken interface {
	Logout() error
	GetUser() (*types.User, error)
}

// PostgrestClient defines the interface for Supabase DB operations
type PostgrestClient interface {
	From(table string) PostgrestQueryBuilder
	WithUserToken(token string) PostgrestClient // Create client with user's JWT for RLS
}

// PostgrestQueryBuilder defines the interface for building queries
type PostgrestQueryBuilder interface {
	Select(columns string, count string, head bool) PostgrestFilterBuilder
}

// PostgrestFilterBuilder defines the interface for filtering queries
type PostgrestFilterBuilder interface {
	Eq(column string, value string) PostgrestFilterBuilder
	ExecuteTo(dest interface{}) (string, error)
}

// AuthServiceInterface defines the interface for the AuthService
type AuthServiceInterface interface {
	Login(ctx context.Context, email string) error
	Logout(ctx context.Context, token string) error
	GetSession(ctx context.Context, userId string, userToken string) (*SessionResponse, error)
}
