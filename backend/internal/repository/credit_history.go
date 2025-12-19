package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// CreditHistoryRepository defines the interface for accessing credit history data.
type CreditHistoryRepository interface {
	// GetCreditHistory retrieves a paginated list of credit history items.
	// userID is optional; if provided, it filters by that user ID.
	GetCreditHistory(ctx context.Context, userID *string, page, perPage int) ([]types.CreditHistoryItemDTO, int64, error)

	// Create records a new credit history entry.
	Create(ctx context.Context, item types.PublicCreditHistoryInsert) error
}
