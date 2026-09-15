package supabase

import (
	"context"
	"encoding/json"
	"sort"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/postgrest-go"
	"github.com/supabase-community/supabase-go"
)

type creditRequestRepository struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

func NewCreditRequestRepository(client *supabase.Client, url, key string) repository.CreditRequestRepository {
	return &creditRequestRepository{
		client:      client,
		supabaseURL: url,
		supabaseKey: key,
	}
}

func (r *creditRequestRepository) ListRequests(ctx context.Context, page, perPage int) ([]types.CreditRequestDTO, int64, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	query := client.From(constants.TableCreditRequests).
		Select("*, helpers:credit_request_helpers(user_id)", "exact", false)

	offset := (page - 1) * perPage
	query = query.Range(offset, offset+perPage-1, "")
	query = query.Order("created_at", &postgrest.OrderOpts{Ascending: false})

	data, count, err := query.Execute()
	if err != nil {
		return nil, 0, err
	}

	var rawData []struct {
		ID           string                    `json:"id"`
		Title        string                    `json:"title"`
		Description  string                    `json:"description"`
		CreditsValue int32                     `json:"credits_value"`
		RequestorID  *string                   `json:"requestor_id"`
		UserHelpedID *string                   `json:"user_helped_id"`
		Status       types.CreditRequestStatus `json:"status"`
		CreatedAt    string                    `json:"created_at"`
		UpdatedAt    string                    `json:"updated_at"`
		Helpers      []struct {
			UserID string `json:"user_id"`
		} `json:"helpers"`
	}

	if err := json.Unmarshal(data, &rawData); err != nil {
		return nil, 0, err
	}

	result := make([]types.CreditRequestDTO, len(rawData))
	for i, item := range rawData {
		helpers := make([]string, len(item.Helpers))
		for j, h := range item.Helpers {
			helpers[j] = h.UserID
		}
		result[i] = types.CreditRequestDTO{
			ID:           item.ID,
			Title:        item.Title,
			Description:  item.Description,
			CreditsValue: item.CreditsValue,
			RequestorID:  item.RequestorID,
			UserHelpedID: item.UserHelpedID,
			Status:       item.Status,
			CreatedAt:    item.CreatedAt,
			UpdatedAt:    item.UpdatedAt,
			Helpers:      helpers,
		}
	}
	return result, count, nil
}

func (r *creditRequestRepository) GetByID(ctx context.Context, id string) (*types.CreditRequestDTO, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableCreditRequests).
		Select("*, helpers:credit_request_helpers(user_id)", "exact", false).
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		return nil, err
	}

	var item struct {
		ID           string                    `json:"id"`
		Title        string                    `json:"title"`
		Description  string                    `json:"description"`
		CreditsValue int32                     `json:"credits_value"`
		RequestorID  *string                   `json:"requestor_id"`
		UserHelpedID *string                   `json:"user_helped_id"`
		Status       types.CreditRequestStatus `json:"status"`
		CreatedAt    string                    `json:"created_at"`
		UpdatedAt    string                    `json:"updated_at"`
		Helpers      []struct {
			UserID string `json:"user_id"`
		} `json:"helpers"`
	}

	if err := json.Unmarshal(data, &item); err != nil {
		return nil, err
	}

	helpers := make([]string, len(item.Helpers))
	for j, h := range item.Helpers {
		helpers[j] = h.UserID
	}

	return &types.CreditRequestDTO{
		ID:           item.ID,
		Title:        item.Title,
		Description:  item.Description,
		CreditsValue: item.CreditsValue,
		RequestorID:  item.RequestorID,
		UserHelpedID: item.UserHelpedID,
		Status:       item.Status,
		CreatedAt:    item.CreatedAt,
		UpdatedAt:    item.UpdatedAt,
		Helpers:      helpers,
	}, nil
}

func (r *creditRequestRepository) Create(ctx context.Context, req types.CreditRequestDTO) (*types.CreditRequestDTO, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	insertData := map[string]interface{}{
		"title":          req.Title,
		"description":    req.Description,
		"credits_value":  req.CreditsValue,
		"requestor_id":   req.RequestorID,
		"user_helped_id": req.UserHelpedID,
		"status":         req.Status,
	}

	data, _, err := client.From(constants.TableCreditRequests).
		Insert(insertData, false, "", "", "representation").
		Single().
		Execute()

	if err != nil {
		return nil, err
	}
	var created struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}

	if len(req.Helpers) > 0 {
		helpersData := make([]map[string]interface{}, len(req.Helpers))
		for i, h := range req.Helpers {
			helpersData[i] = map[string]interface{}{
				"credit_request_id": created.ID,
				"user_id":           h,
			}
		}
		_, _, err = client.From(constants.TableCreditRequestHelpers).
			Insert(helpersData, false, "", "", "minimal").
			Execute()
		if err != nil {
			return nil, err
		}
	}

	return r.GetByID(ctx, created.ID)
}

func (r *creditRequestRepository) Update(ctx context.Context, id string, req types.CreditRequestDTO) (*types.CreditRequestDTO, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	updateData := map[string]interface{}{
		"title":          req.Title,
		"description":    req.Description,
		"credits_value":  req.CreditsValue,
		"user_helped_id": req.UserHelpedID,
		"status":         req.Status,
	}

	_, _, err := client.From(constants.TableCreditRequests).
		Update(updateData, "", "minimal").
		Eq("id", id).
		Execute()
	if err != nil {
		return nil, err
	}

	// For helpers, we delete all existing and insert new ones
	_, _, err = client.From(constants.TableCreditRequestHelpers).
		Delete("", "minimal").
		Eq("credit_request_id", id).
		Execute()

	if err != nil {
		return nil, err
	}

	if len(req.Helpers) > 0 {
		helpersData := make([]map[string]interface{}, len(req.Helpers))
		for i, h := range req.Helpers {
			helpersData[i] = map[string]interface{}{
				"credit_request_id": id,
				"user_id":           h,
			}
		}
		_, _, err = client.From(constants.TableCreditRequestHelpers).
			Insert(helpersData, false, "", "", "minimal").
			Execute()
		if err != nil {
			return nil, err
		}
	}

	return r.GetByID(ctx, id)
}

func (r *creditRequestRepository) UpdateStatus(ctx context.Context, id string, status types.CreditRequestStatus, creditsValue *int32, helpers []string) error {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	updateData := map[string]interface{}{
		"status": status,
	}
	if creditsValue != nil {
		updateData["credits_value"] = *creditsValue
	}
	_, _, err := client.From(constants.TableCreditRequests).
		Update(updateData, "", "minimal").
		Eq("id", id).
		Execute()

	if err != nil {
		return err
	}

	if helpers != nil {
		_, _, err = client.From(constants.TableCreditRequestHelpers).
			Delete("", "minimal").
			Eq("credit_request_id", id).
			Execute()
		if err != nil {
			return err
		}
		if len(helpers) > 0 {
			helpersData := make([]map[string]interface{}, len(helpers))
			for i, h := range helpers {
				helpersData[i] = map[string]interface{}{
					"credit_request_id": id,
					"user_id":           h,
				}
			}
			_, _, err = client.From(constants.TableCreditRequestHelpers).
				Insert(helpersData, false, "", "", "minimal").
				Execute()
			if err != nil {
				return err
			}
		}
	}

	return nil
}

func (r *creditRequestRepository) GetLeaderboard(ctx context.Context) ([]types.UserCreditLeaderboardItem, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	// We need to fetch all approved / approved with changes requests and their helpers.
	// Since PostgREST doesn't directly support GROUP BY easily without an RPC, we fetch and calculate in memory, or use a view/rpc.
	// Let's just fetch all helpers for approved requests.
	query := client.From(constants.TableCreditRequestHelpers).
		Select("user_id, user:profiles!user_id(username), credit_request:credit_requests!inner(credits_value, status)", "exact", false).
		In("credit_request.status", []string{string(types.CreditRequestStatusApproved), string(types.CreditRequestStatusApprovedWithChanges)})

	data, _, err := query.Execute()
	if err != nil {
		return nil, err
	}

	var rawData []struct {
		UserID string `json:"user_id"`
		User   struct {
			Username string `json:"username"`
		} `json:"user"`
		CreditRequest struct {
			CreditsValue int32  `json:"credits_value"`
			Status       string `json:"status"`
		} `json:"credit_request"`
	}

	if err := json.Unmarshal(data, &rawData); err != nil {
		return nil, err
	}

	m := make(map[string]types.UserCreditLeaderboardItem)
	for _, item := range rawData {
		if _, exists := m[item.UserID]; !exists {
			m[item.UserID] = types.UserCreditLeaderboardItem{
				UserID:       item.UserID,
				Username:     item.User.Username,
				TotalCredits: 0,
			}
		}
		curr := m[item.UserID]
		curr.TotalCredits += item.CreditRequest.CreditsValue
		m[item.UserID] = curr
	}

	var result []types.UserCreditLeaderboardItem
	for _, v := range m {
		result = append(result, v)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].TotalCredits > result[j].TotalCredits
	})

	return result, nil
}
