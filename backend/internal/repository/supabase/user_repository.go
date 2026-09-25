package supabase

import (
	"context"
	"encoding/json"
	"fmt"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"

	"github.com/supabase-community/supabase-go"
)

type userRepository struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
	serviceKey  string
}

func NewUserRepository(client *supabase.Client, url string, key string, serviceKey string) repository.UserRepository {
	return &userRepository{
		client:      client,
		supabaseURL: url,
		supabaseKey: key,
		serviceKey:  serviceKey,
	}
}
func (r *userRepository) List(ctx context.Context, page, perPage int, role, search string) ([]types.PublicProfilesSelect, int64, error) {
	offset := (page - 1) * perPage
	// Use authenticated client for RLS enforcement
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	query := client.From(constants.TableProfiles).Select("*", "exact", false)
	if role != "" {
		query = query.Eq("role", role)
	}
	if search != "" {
		searchTerm := validation.SanitizeSearchTerm(search)
		filter := fmt.Sprintf("username.ilike.%%%s%%,email.ilike.%%%s%%", searchTerm, searchTerm)
		query = query.Or(filter, "")
	}
	// Pagination
	query = query.Range(offset, offset+perPage-1, "")
	data, count, err := query.Execute()
	if err != nil {
		return nil, 0, err
	}
	// Debug logging
	if len(data) > 0 {
		logger.Debugf(ctx, "Repo List Raw JSON (len=%d): %s", len(data), string(data))
	}
	var profiles []types.PublicProfilesSelect
	if err := json.Unmarshal(data, &profiles); err != nil {
		return nil, 0, err
	}
	return profiles, count, nil
}
func (r *userRepository) GetByID(ctx context.Context, id string) (*types.PublicProfilesSelect, error) {
	logger.Debugf(ctx, "Repo GetByID: Attempting to fetch profile for ID %s", id)
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableProfiles).
		Select("*", "", false).
		Eq("id", id).
		Single().
		Execute()
	if err != nil {
		logger.Errorf(ctx, "Repo GetByID: Supabase Query Failed for ID %s: %v", id, err)
		return nil, err
	}
	var profile types.PublicProfilesSelect
	if err := json.Unmarshal(data, &profile); err != nil {
		return nil, err
	}
	return &profile, nil
}
func (r *userRepository) GetByEmail(ctx context.Context, email string) (*types.PublicProfilesSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableProfiles).
		Select("*", "", false).
		Eq("email", email).
		Single().
		Execute()
	if err != nil {
		return nil, err
	}
	var profile types.PublicProfilesSelect
	if err := json.Unmarshal(data, &profile); err != nil {
		return nil, err
	}
	return &profile, nil
}
func (r *userRepository) Create(ctx context.Context, profile types.PublicProfilesInsert) (*types.PublicProfilesSelect, error) {
	var client *supabase.Client
	var err error
	if r.serviceKey != "" {
		client, err = supabase.NewClient(r.supabaseURL, r.serviceKey, &supabase.ClientOptions{
			Headers: map[string]string{
				"Authorization": "Bearer " + r.serviceKey,
				"apikey":        r.serviceKey,
			},
		})
		if err != nil {
			logger.Errorf(ctx, "Failed to create admin client for profile creation: %v", err)
			return nil, err
		}
	} else {
		logger.Warn(ctx, "Service key missing for profile creation, falling back to user context")
		client = getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	}
	data, _, err := client.From(constants.TableProfiles).
		Insert(profile, false, "", "", "representation").
		Single().
		Execute()
	if err != nil {
		logger.Errorf(ctx, "Repo Create Failed: %v", err)
		return nil, err
	}
	var createdProfile types.PublicProfilesSelect
	if err := json.Unmarshal(data, &createdProfile); err != nil {
		return nil, err
	}
	return &createdProfile, nil
}
func (r *userRepository) Update(ctx context.Context, id string, profile types.PublicProfilesUpdate) (*types.PublicProfilesSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableProfiles).
		Update(profile, "", "").
		Eq("id", id).
		Single().
		Execute()
	if err != nil {
		logger.Errorf(ctx, "Repo Update Failed for ID %s: %v", id, err)
		return nil, err
	}
	var updatedProfile types.PublicProfilesSelect
	if err := json.Unmarshal(data, &updatedProfile); err != nil {
		return nil, err
	}
	return &updatedProfile, nil
}
func (r *userRepository) BulkAdjustCreditsAtomic(ctx context.Context, userIDs []string, adminID string, amount int32, reason string, description string) error {
	params := map[string]interface{}{
		"p_user_ids":    userIDs,
		"p_admin_id":    adminID,
		"p_amount":      amount,
		"p_reason":      reason,
		"p_description": description,
	}
	// Log the RPC call parameters for debugging
	logger.Debugf(ctx, "BulkAdjustCredits RPC params: user_ids=%v, admin_id=%s, amount=%d, reason=%s, description=%s",
		userIDs, adminID, amount, reason, description)
	// Use authenticated client - RLS policies map permissions
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	jsonStr := client.Rpc("bulk_adjust_user_credits", "", params)
	// Log the raw RPC response
	logger.Debugf(ctx, "BulkAdjustCredits RPC response: %q", jsonStr)
	// For void-returning functions, empty string or "null" is success
	if jsonStr == "" || jsonStr == "null" {
		logger.Infof(ctx, "BulkAdjustCredits RPC completed successfully for %d users", len(userIDs))
		return nil
	}
	// Check for error in response (Supabase returns error as JSON with "message" field)
	var rawResponse map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err == nil {
		if msg, ok := rawResponse["message"]; ok {
			logger.Errorf(ctx, "BulkAdjustCredits RPC error message: %v", msg)
			return types.NewInternalError(fmt.Sprintf("RPC Error: %v", msg), nil)
		}
		if code, ok := rawResponse["code"]; ok {
			logger.Errorf(ctx, "BulkAdjustCredits RPC error code: %v, details: %v", code, rawResponse)
			return types.NewInternalError(fmt.Sprintf("RPC Error (code %v): %v", code, rawResponse), nil)
		}
	}
	// If we got here with a non-empty response that's not an error, log it and proceed
	logger.Debugf(ctx, "BulkAdjustCredits RPC returned non-error response: %s", jsonStr)
	return nil
}
