// Package common provides adapter implementations for Supabase Auth and Database clients.
// These adapters implement the service interfaces and wrap Supabase SDK functionality.
package common

import (
	service "magazyn/backend/internal/service"

	"github.com/supabase-community/gotrue-go/types"
	postgrest "github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

// --- Adapters for Supabase Auth ---

// SupabaseAuthAdapter adapts the Supabase Auth client to implement the AuthClient interface.
type SupabaseAuthAdapter struct {
	client *supabase.Client
}

// NewSupabaseAuthAdapter creates a new Supabase Auth adapter.
func NewSupabaseAuthAdapter(client *supabase.Client) service.AuthClient {
	return &SupabaseAuthAdapter{client: client}
}

func (a *SupabaseAuthAdapter) OTP(req types.OTPRequest) error {
	return a.client.Auth.OTP(req)
}

func (a *SupabaseAuthAdapter) WithToken(token string) service.AuthClientWithToken {
	return &SupabaseAuthWithTokenAdapter{
		client: a.client.Auth.WithToken(token),
	}
}

// SupabaseAuthWithTokenAdapter wraps the Supabase Auth client with a user token for authenticated operations.
type SupabaseAuthWithTokenAdapter struct {
	client interface {
		Logout() error
		GetUser() (*types.UserResponse, error)
	}
}

func (a *SupabaseAuthWithTokenAdapter) Logout() error {
	return a.client.Logout()
}

func (a *SupabaseAuthWithTokenAdapter) GetUser() (*types.User, error) {
	resp, err := a.client.GetUser()
	if err != nil {
		return nil, err
	}
	return &resp.User, nil
}

// --- Adapters for Supabase DB ---

// SupabaseDBAdapter adapts the Supabase database client to implement the PostgrestClient interface.
type SupabaseDBAdapter struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

// NewSupabaseDBAdapter creates a new Supabase database adapter.
func NewSupabaseDBAdapter(client *supabase.Client, url string, key string) service.PostgrestClient {
	return &SupabaseDBAdapter{
		client:      client,
		supabaseURL: url,
		supabaseKey: key,
	}
}

func (a *SupabaseDBAdapter) From(table string) service.PostgrestQueryBuilder {
	return &SupabaseQueryBuilderAdapter{builder: a.client.From(table)}
}

// WithUserToken creates a new DB adapter with the user's JWT token for RLS enforcement.
// This ensures Row Level Security policies see the correct auth.uid() from the JWT token.
// If client creation fails, it returns the original adapter as a fallback.
func (a *SupabaseDBAdapter) WithUserToken(token string) service.PostgrestClient {
	clientWithAuth, err := supabase.NewClient(
		a.supabaseURL,
		a.supabaseKey,
		&supabase.ClientOptions{
			Headers: map[string]string{
				"Authorization": "Bearer " + token,
			},
		},
	)
	if err != nil {
		return a
	}
	return &SupabaseDBAdapter{
		client:      clientWithAuth,
		supabaseURL: a.supabaseURL,
		supabaseKey: a.supabaseKey,
	}
}

// SupabaseQueryBuilderAdapter adapts the Supabase QueryBuilder to implement PostgrestQueryBuilder.
type SupabaseQueryBuilderAdapter struct {
	builder *postgrest.QueryBuilder
}

func (b *SupabaseQueryBuilderAdapter) Select(columns string, count string, head bool) service.PostgrestFilterBuilder {
	return &SupabaseFilterBuilderAdapter{builder: b.builder.Select(columns, count, head)}
}

// SupabaseFilterBuilderAdapter adapts the Supabase FilterBuilder to implement PostgrestFilterBuilder.
type SupabaseFilterBuilderAdapter struct {
	builder *postgrest.FilterBuilder
}

func (f *SupabaseFilterBuilderAdapter) Eq(column string, value string) service.PostgrestFilterBuilder {
	f.builder.Eq(column, value)
	return f
}

func (f *SupabaseFilterBuilderAdapter) ExecuteTo(dest interface{}) (string, error) {
	if _, err := f.builder.ExecuteTo(dest); err != nil {
		return "", err
	}
	return "", nil
}
