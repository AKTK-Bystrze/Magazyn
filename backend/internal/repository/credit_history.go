package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// CreditHistoryRepository defines the interface for accessing credit history data.
type CreditHistoryRepository interface {
	GetCreditHistory(ctx context.Context, userID *string, page, perPage int) ([]types.CreditHistoryItemDTO, int64, error)

	Create(ctx context.Context, item types.PublicCreditHistoryInsert) error
}
