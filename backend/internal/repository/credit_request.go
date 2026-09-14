package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// CreditRequestRepository defines the data access interface for credit request operations.
type CreditRequestRepository interface {
	// ListRequests returns a paginated list of credit requests with their helpers.
	ListRequests(ctx context.Context, page, perPage int) ([]types.CreditRequestDTO, int64, error)
	// GetByID returns a single credit request by its ID.
	GetByID(ctx context.Context, id string) (*types.CreditRequestDTO, error)
	// Create inserts a new credit request and its helper associations.
	Create(ctx context.Context, req types.CreditRequestDTO) (*types.CreditRequestDTO, error)
	// Update modifies an existing credit request and replaces its helper associations.
	Update(ctx context.Context, id string, req types.CreditRequestDTO) (*types.CreditRequestDTO, error)
	// UpdateStatus changes the status of a credit request, optionally overriding credits and helpers.
	UpdateStatus(ctx context.Context, id string, status types.CreditRequestStatus, creditsValue *int32, helpers []string) error
	// GetLeaderboard returns aggregated credits per user from approved requests.
	GetLeaderboard(ctx context.Context) ([]types.UserCreditLeaderboardItem, error)
}
