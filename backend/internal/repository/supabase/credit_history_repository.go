package supabase

import (
	"context"
	"encoding/json"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

type creditHistoryRepository struct {
	client *supabase.Client
}

// NewCreditHistoryRepository creates a new Supabase implementation of CreditHistoryRepository.
func NewCreditHistoryRepository(client *supabase.Client) repository.CreditHistoryRepository {
	return &creditHistoryRepository{
		client: client,
	}
}

// GetCreditHistory retrieves a paginated list of credit history items.
func (r *creditHistoryRepository) GetCreditHistory(ctx context.Context, userID *string, page, perPage int) ([]types.CreditHistoryItemDTO, int64, error) {
	// Build the query
	// We select all fields from credit_history, plus the username from the associated user profile
	// and the username from the associated admin profile (if any).
	query := r.client.From(constants.TableCreditHistory).
		Select("*, user:profiles!user_id(username), admin:profiles!admin_id(username)", "exact", false)

	// Apply UserID filter if provided
	if userID != nil {
		query = query.Eq("user_id", *userID)
	}

	// Calculate pagination
	offset := (page - 1) * perPage
	query = query.Range(offset, offset+perPage-1, "exact")

	// Order by created_at descending (newest first)
	query = query.Order("created_at", &postgrest.OrderOpts{Ascending: false})

	// Execute query
	data, count, err := query.Execute()
	if err != nil {
		return nil, 0, err
	}

	// Define a temporary struct to handle the nested JSON response from Supabase
	var rawData []struct {
		types.PublicCreditHistorySelect
		User struct {
			Username string `json:"username"`
		} `json:"user"`
		Admin *struct {
			Username string `json:"username"`
		} `json:"admin"`
	}

	if err := json.Unmarshal(data, &rawData); err != nil {
		return nil, 0, err
	}

	// Map to CreditHistoryItemDTO
	result := make([]types.CreditHistoryItemDTO, len(rawData))
	for i, item := range rawData {
		dto := types.CreditHistoryItemDTO{
			ID:            item.ID,
			UserID:        item.UserID,
			Username:      item.User.Username,
			Amount:        item.Amount,
			Reason:        item.Reason,
			Description:   item.Description,
			ReservationID: item.ReservationID,
			AdminID:       item.AdminID,
			CreatedAt:     item.CreatedAt,
		}

		if item.Admin != nil {
			dto.AdminUsername = &item.Admin.Username
		}

		result[i] = dto
	}

	return result, count, nil
}
