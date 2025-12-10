package repository

import (
	"context"
	"magazyn/backend/internal/types"
)

// UserRepository defines the interface for user profile data access
type UserRepository interface {
	// List retrieves a paginated list of user profiles based on filters
	List(ctx context.Context, page, perPage int, role, search string) ([]types.PublicProfilesSelect, int64, error)

	// GetByID retrieves a single user profile by ID
	GetByID(ctx context.Context, id string) (*types.PublicProfilesSelect, error)

	// GetByEmail retrieves a single user profile by Email
	GetByEmail(ctx context.Context, email string) (*types.PublicProfilesSelect, error)

	// Create creates a new user profile record
	Create(ctx context.Context, profile types.PublicProfilesInsert) (*types.PublicProfilesSelect, error)

	// Update updates an existing user profile record
	Update(ctx context.Context, id string, profile types.PublicProfilesUpdate) (*types.PublicProfilesSelect, error)
}
