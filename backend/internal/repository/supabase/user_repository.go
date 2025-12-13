package supabase

import (
	"context"
	"encoding/json"
	"fmt"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type userRepository struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

// NewUserRepository creates a new Supabase implementation of UserRepository.
func NewUserRepository(client *supabase.Client, url string, key string) repository.UserRepository {
	return &userRepository{
		client:      client,
		supabaseURL: url,
		supabaseKey: key,
	}
}

// List retrieves a paginated list of user profiles based on filters (role, search).
func (r *userRepository) List(ctx context.Context, page, perPage int, role, search string) ([]types.PublicProfilesSelect, int64, error) {
	// Calculate offset
	offset := (page - 1) * perPage

	// Use authenticated client for RLS enforcement
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	query := client.From(constants.TableProfiles).Select("*", "", false)

	if role != "" {
		query = query.Eq("role", role)
	}

	if search != "" {
		// Use ILIKE for case-insensitive search on username or email
		filter := fmt.Sprintf("username.ilike.%%%s%%,email.ilike.%%%s%%", search, search)
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

// GetByID retrieves a single user profile by ID.
func (r *userRepository) GetByID(ctx context.Context, id string) (*types.PublicProfilesSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	data, _, err := client.From(constants.TableProfiles).
		Select("*", "", false).
		Eq("id", id).
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

// GetByEmail retrieves a single user profile by Email.
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

// Create creates a new user profile record in the database.
func (r *userRepository) Create(ctx context.Context, profile types.PublicProfilesInsert) (*types.PublicProfilesSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	data, _, err := client.From(constants.TableProfiles).
		Insert(profile, false, "", "", "representation").
		Single().
		Execute()

	if err != nil {
		return nil, err
	}

	var createdProfile types.PublicProfilesSelect
	if err := json.Unmarshal(data, &createdProfile); err != nil {
		return nil, err
	}

	return &createdProfile, nil
}

// Update updates an existing user profile record in the database.
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
