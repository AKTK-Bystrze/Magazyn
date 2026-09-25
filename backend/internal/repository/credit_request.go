package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// CreditRequestRepository defines the data access interface for credit request operations.
type CreditRequestRepository interface {
	ListRequests(ctx context.Context, page, perPage int) ([]types.CreditRequestDTO, int64, error)
	GetByID(ctx context.Context, id string) (*types.CreditRequestDTO, error)
	Create(ctx context.Context, req types.CreditRequestDTO) (*types.CreditRequestDTO, error)
	Update(ctx context.Context, id string, req types.CreditRequestDTO) (*types.CreditRequestDTO, error)
	ReviewAtomic(ctx context.Context, id string, adminID string, status types.CreditRequestStatus, creditsValue *int32, helpers []string, reason string, description string) error
	GetLeaderboard(ctx context.Context) ([]types.UserCreditLeaderboardItem, error)
}
