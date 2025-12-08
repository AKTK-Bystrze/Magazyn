package service

import (
	"github.com/supabase-community/gotrue-go/types"
	postgrest "github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

// --- Adapters for Supabase Auth ---

type SupabaseAuthAdapter struct {
	client *supabase.Client
}

func NewSupabaseAuthAdapter(client *supabase.Client) AuthClient {
	return &SupabaseAuthAdapter{client: client}
}

func (a *SupabaseAuthAdapter) OTP(req types.OTPRequest) error {
	return a.client.Auth.OTP(req)
}

func (a *SupabaseAuthAdapter) WithToken(token string) AuthClientWithToken {
	return &SupabaseAuthWithTokenAdapter{
		client: a.client.Auth.WithToken(token),
	}
}

// SupabaseAuthWithTokenAdapter wraps the client returned by WithToken
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

type SupabaseDBAdapter struct {
	client *supabase.Client
}

func NewSupabaseDBAdapter(client *supabase.Client) PostgrestClient {
	return &SupabaseDBAdapter{client: client}
}

func (a *SupabaseDBAdapter) From(table string) PostgrestQueryBuilder {
	return &SupabaseQueryBuilderAdapter{builder: a.client.From(table)}
}

type SupabaseQueryBuilderAdapter struct {
	builder *postgrest.QueryBuilder
}

func (b *SupabaseQueryBuilderAdapter) Select(columns string, count string, head bool) PostgrestFilterBuilder {
	return &SupabaseFilterBuilderAdapter{builder: b.builder.Select(columns, count, head)}
}

type SupabaseFilterBuilderAdapter struct {
	builder *postgrest.FilterBuilder
}

func (f *SupabaseFilterBuilderAdapter) Eq(column string, value string) PostgrestFilterBuilder {
	f.builder.Eq(column, value)
	return f
}

func (f *SupabaseFilterBuilderAdapter) ExecuteTo(dest interface{}) (string, error) {
	if _, err := f.builder.ExecuteTo(dest); err != nil {
		return "", err
	}
	return "", nil
}
