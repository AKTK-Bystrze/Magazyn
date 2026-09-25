// These interfaces enable dependency injection and facilitate testing with mocks.
package service

import (
	"context"

	"magazyn/backend/internal/types"

	gotruetypes "github.com/supabase-community/gotrue-go/types"
)

type AuthClient interface {
	OTP(req gotruetypes.OTPRequest) error
	WithToken(token string) AuthClientWithToken
}
type AuthClientWithToken interface {
	Logout() error
	GetUser() (*gotruetypes.User, error)
}
type PostgrestClient interface {
	From(table string) PostgrestQueryBuilder
	WithUserToken(token string) PostgrestClient // Create client with user's JWT for RLS
}
type PostgrestQueryBuilder interface {
	Select(columns string, count string, head bool) PostgrestFilterBuilder
}
type PostgrestFilterBuilder interface {
	Eq(column string, value string) PostgrestFilterBuilder
	ExecuteTo(dest interface{}) (string, error)
}
type AuthServiceInterface interface {
	Login(ctx context.Context, email string) (*types.LoginResponse, error)
	Logout(ctx context.Context, token string) error
	GetSession(ctx context.Context, userID string, userToken string) (*types.SessionResponse, error)
}
