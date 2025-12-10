package supabase

import (
	"context"
	"encoding/json"
	"fmt"
	"magazyn/backend/internal/constants"
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

	query := r.client.From(constants.TableProfiles).Select("*", "exact", false)

	if role != "" {
		query = query.Eq("role", role)
	}

	if search != "" {
		// Use ILIKE for case-insensitive search on username or email
		filter := fmt.Sprintf("username.ilike.%%%s%%,email.ilike.%%%s%%", search, search)
		query = query.Or(filter, "")
	}

	// Pagination
	query = query.Range(offset, offset+perPage-1, "exact")

	data, count, err := query.Execute()
	if err != nil {
		return nil, 0, err
	}

	var profiles []types.PublicProfilesSelect
	if err := json.Unmarshal(data, &profiles); err != nil {
		return nil, 0, err
	}

	return profiles, count, nil
}

// GetByID retrieves a single user profile by ID.
func (r *userRepository) GetByID(ctx context.Context, id string) (*types.PublicProfilesSelect, error) {
	data, _, err := r.client.From(constants.TableProfiles).
		Select("*", "exact", false).
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
	data, _, err := r.client.From(constants.TableProfiles).
		Select("*", "exact", false).
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
	data, _, err := r.client.From(constants.TableProfiles).
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
	data, _, err := r.client.From(constants.TableProfiles).
		Update(profile, "", "").
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		return nil, err
	}

	var updatedProfile types.PublicProfilesSelect
	if err := json.Unmarshal(data, &updatedProfile); err != nil {
		return nil, err
	}

	return &updatedProfile, nil
}
