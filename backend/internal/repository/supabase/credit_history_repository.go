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
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

// NewCreditHistoryRepository creates a new Supabase implementation of CreditHistoryRepository.
func NewCreditHistoryRepository(client *supabase.Client, url, key string) repository.CreditHistoryRepository {
	return &creditHistoryRepository{
		client:      client,
		supabaseURL: url,
		supabaseKey: key,
	}
}

// GetCreditHistory retrieves a paginated list of credit history items.
func (r *creditHistoryRepository) GetCreditHistory(ctx context.Context, userID *string, page, perPage int) ([]types.CreditHistoryItemDTO, int64, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	query := client.From(constants.TableCreditHistory).
		Select("*, user:profiles!user_id(username), author:profiles!author_id(username)", "exact", false)

	if userID != nil {
		query = query.Eq("user_id", *userID)
	}

	offset := (page - 1) * perPage
	query = query.Range(offset, offset+perPage-1, "")

	query = query.Order("created_at", &postgrest.OrderOpts{Ascending: false})

	data, count, err := query.Execute()
	if err != nil {
		return nil, 0, err
	}

	var rawData []struct {
		types.PublicCreditHistorySelect
		User struct {
			Username string `json:"username"`
		} `json:"user"`
		Author *struct {
			Username string `json:"username"`
		} `json:"author"`
	}

	if err := json.Unmarshal(data, &rawData); err != nil {
		return nil, 0, err
	}

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
			AuthorID:      item.AuthorID,
			CreatedAt:     item.CreatedAt,
		}

		if item.Author != nil {
			dto.AuthorUsername = &item.Author.Username
		}

		result[i] = dto
	}

	return result, count, nil
}

// Create records a new credit history entry in the database.
func (r *creditHistoryRepository) Create(ctx context.Context, item types.PublicCreditHistoryInsert) error {
	_, _, err := r.client.From(constants.TableCreditHistory).
		Insert(item, false, "", "", "representation").
		Execute()

	return err
}
