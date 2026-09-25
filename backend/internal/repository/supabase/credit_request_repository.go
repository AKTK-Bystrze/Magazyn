package supabase

import (
	"context"
	"encoding/json"
	"fmt"
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
	params := map[string]interface{}{
		"p_title":          req.Title,
		"p_description":    req.Description,
		"p_credits_value":  req.CreditsValue,
		"p_requestor_id":   req.RequestorID,
		"p_user_helped_id": req.UserHelpedID,
		"p_helpers":        req.Helpers,
	}
	jsonStr := client.Rpc("create_credit_request_atomic", "", params)
	if jsonStr == "" || jsonStr == "null" {
		return nil, types.NewInternalError("RPC returned empty response", nil)
	}
	var rawResponse map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err != nil {
		return nil, types.NewInternalError("Failed to parse RPC response: "+jsonStr, err)
	}
	if msg, ok := rawResponse["message"]; ok {
		if _, hasID := rawResponse["id"]; !hasID {
			return nil, types.NewInternalError(fmt.Sprintf("RPC Error: %v", msg), nil)
		}
	}
	var result struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, types.NewInternalError("RPC failed to map result: "+jsonStr, err)
	}
	return r.GetByID(ctx, result.ID)
}
func (r *creditRequestRepository) Update(ctx context.Context, id string, req types.CreditRequestDTO) (*types.CreditRequestDTO, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	params := map[string]interface{}{
		"p_id":             id,
		"p_title":          req.Title,
		"p_description":    req.Description,
		"p_credits_value":  req.CreditsValue,
		"p_user_helped_id": req.UserHelpedID,
		"p_status":         req.Status,
		"p_helpers":        req.Helpers,
	}
	jsonStr := client.Rpc("update_credit_request_atomic", "", params)
	if err := parseRPCVoidResponse(jsonStr); err != nil {
		return nil, err
	}
	return r.GetByID(ctx, id)
}
func (r *creditRequestRepository) ReviewAtomic(ctx context.Context, id string, adminID string,
	status types.CreditRequestStatus, creditsValue *int32, helpers []string,
	reason string, description string) error {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	params := map[string]interface{}{
		"p_id":          id,
		"p_admin_id":    adminID,
		"p_status":      status,
		"p_reason":      reason,
		"p_description": description,
	}
	if creditsValue != nil {
		params["p_credits_value"] = *creditsValue
	}
	if helpers != nil {
		params["p_helpers"] = helpers
	}
	jsonStr := client.Rpc("review_credit_request_atomic", "", params)
	return parseRPCVoidResponse(jsonStr)
}
func (r *creditRequestRepository) GetLeaderboard(ctx context.Context) ([]types.UserCreditLeaderboardItem, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	jsonStr := client.Rpc("get_credit_leaderboard", "", map[string]interface{}{})
	if jsonStr == "" || jsonStr == "null" {
		return []types.UserCreditLeaderboardItem{}, nil
	}
	var rawResponse interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err == nil {
		if mapResp, ok := rawResponse.(map[string]interface{}); ok {
			if msg, ok := mapResp["message"]; ok {
				return nil, types.NewInternalError(fmt.Sprintf("RPC Error: %v", msg), nil)
			}
		}
	}
	var result []types.UserCreditLeaderboardItem
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, types.NewInternalError("Failed to parse leaderboard response", err)
	}
	return result, nil
}
func parseRPCVoidResponse(jsonStr string) error {
	if jsonStr == "" || jsonStr == "null" {
		return nil
	}
	var rawResponse map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err == nil {
		if msg, ok := rawResponse["message"]; ok {
			return types.NewInternalError(fmt.Sprintf("RPC Error: %v", msg), nil)
		}
	}
	return nil
}
