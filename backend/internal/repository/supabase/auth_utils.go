package supabase

import (
	"context"
	"encoding/json"
	"fmt"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

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

func parseRPCVoidResponse(jsonStr string) error {
	if jsonStr == "" || jsonStr == "null" {
		return nil
	}
	var rawResponse map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err == nil {
		if msg, ok := rawResponse["message"]; ok {
			return types.NewInternalError(fmt.Sprintf("RPC Error: %v", msg), nil)
		}
	}
	return nil
}
