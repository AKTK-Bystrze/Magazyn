package supabase

import (
	"context"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"

	"github.com/supabase-community/supabase-go"
)

// getClientWithAuth creates a Supabase client authenticated with the user's JWT token from context.
// This ensures RLS policies can identify the user via auth.uid().
// If no token is in context, returns the default client (with anon key).
//
// This is a shared utility for all repositories that need RLS enforcement.
func getClientWithAuth(ctx context.Context, client *supabase.Client, url, key string) *supabase.Client {
	token, ok := ctx.Value(appcontext.AccessTokenContextKey).(string)
	if !ok || token == "" {
		return client
	}

	clientWithAuth, err := supabase.NewClient(
		url,
		key,
		&supabase.ClientOptions{
			Headers: map[string]string{
				"Authorization": "Bearer " + token,
			},
		},
	)
	if err != nil {
		logger.Warnf(ctx, "Failed to create authenticated client, using default: %v", err)
		return client
	}
	return clientWithAuth
}
