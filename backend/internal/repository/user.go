package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// UserRepository defines the interface for user profile data access
type UserRepository interface {
	List(ctx context.Context, page, perPage int, role, search string) ([]types.PublicProfilesSelect, int64, error)

	GetByID(ctx context.Context, id string) (*types.PublicProfilesSelect, error)

	GetByEmail(ctx context.Context, email string) (*types.PublicProfilesSelect, error)

	Create(ctx context.Context, profile types.PublicProfilesInsert) (*types.PublicProfilesSelect, error)

	Update(ctx context.Context, id string, profile types.PublicProfilesUpdate) (*types.PublicProfilesSelect, error)

	BulkAdjustCreditsAtomic(ctx context.Context, userIDs []string, adminID string, amount int32, reason string, description string) error
}
