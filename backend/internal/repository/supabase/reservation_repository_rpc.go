package supabase

import (
	"context"
	"encoding/json"
	"fmt"

	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
)

func (r *reservationRepository) CreateReservationsAtomic(ctx context.Context, userID string, totalCost int32, isFree bool, createdByUserID string, reservations []types.CreateReservationItem) ([]string, int32, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	params := map[string]interface{}{
		"p_user_id":            userID,
		"p_total_cost":         totalCost,
		"p_is_free":            isFree,
		"p_created_by_user_id": createdByUserID,
		"p_reservations":       reservations,
	}
	paramBytes, _ := json.Marshal(params)
	logger.Infof(ctx, "RPC Params: %s", string(paramBytes))
	jsonStr := client.Rpc("create_reservation_atomic", "", params)
	logger.Infof(ctx, "RPC Response: %s", jsonStr)
	var result struct {
		ReservationIDs []string `json:"reservation_ids"`
		NewBalance     int32    `json:"new_balance"`
		Message        *string  `json:"message"`
		Error          *string  `json:"error"`
	}
	if jsonStr == "" {
		return nil, 0, types.NewInternalError("RPC returned empty response", nil)
	}
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, 0, types.NewInternalError("Failed to parse RPC response: "+jsonStr, err)
	}
	if result.Message != nil && len(result.ReservationIDs) == 0 {
		return nil, 0, types.NewConflictError(*result.Message, nil)
	}
	if result.Error != nil {
		return nil, 0, types.NewInternalError(fmt.Sprintf("RPC Error: %s", *result.Error), nil)
	}
	return result.ReservationIDs, result.NewBalance, nil
}

func (r *reservationRepository) UpdateReservation(ctx context.Context, id string, reservation types.PublicReservationsUpdate, changedByUserID string) (*types.PublicReservationsSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	params := map[string]interface{}{
		"p_reservation_id":     id,
		"p_changed_by_user_id": changedByUserID,
	}
	if reservation.Status != nil {
		params["p_status"] = *reservation.Status
	}
	if reservation.StartDate != nil {
		params["p_start_date"] = *reservation.StartDate
	}
	if reservation.EndDate != nil {
		params["p_end_date"] = *reservation.EndDate
	}
	jsonStr := client.Rpc("update_reservation_with_audit", "", params)
	if jsonStr == "" {
		return nil, types.NewInternalError("RPC returned empty response", nil)
	}
	if err := parseRPCMessageError(jsonStr); err != nil {
		return nil, err
	}
	var result struct {
		ID        string  `json:"id"`
		Status    string  `json:"status"`
		StartDate string  `json:"start_date"`
		EndDate   string  `json:"end_date"`
		UpdatedAt *string `json:"updated_at"`
	}
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, types.NewInternalError("Failed to parse update result: "+jsonStr, err)
	}
	return &types.PublicReservationsSelect{
		ID:        result.ID,
		Status:    result.Status,
		StartDate: result.StartDate,
		EndDate:   result.EndDate,
		UpdatedAt: result.UpdatedAt,
	}, nil
}

func (r *reservationRepository) BulkUpdateStatusAtomic(ctx context.Context, ids []string, status string, adminID string) (*types.BulkStatusUpdateResponse, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	params := map[string]interface{}{
		"p_reservation_ids": ids,
		"p_status":          status,
		"p_admin_id":        adminID,
	}
	jsonStr := client.Rpc("bulk_update_reservations_status", "", params)
	if jsonStr == "" {
		return nil, types.NewInternalError("RPC returned empty response", nil)
	}
	if err := parseRPCMessageError(jsonStr); err != nil {
		return nil, err
	}
	var result types.BulkStatusUpdateResponse
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, types.NewInternalError("Failed to parse bulk update result: "+jsonStr, err)
	}
	return &result, nil
}

func (r *reservationRepository) RefundCredits(ctx context.Context, reservationID string, amount int32) error {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	params := map[string]interface{}{
		"p_reservation_id": reservationID,
		"p_amount":         amount,
	}
	jsonStr := client.Rpc("refund_reservation_credits", "", params)
	return parseRPCVoidResponse(jsonStr)
}

func (r *reservationRepository) ModifyReservationDatesWithCredits(ctx context.Context, reservationID string, changedByUserID string, newStartDate string, newEndDate string) (*types.ModifyDatesResponse, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	params := map[string]interface{}{
		"p_reservation_id":     reservationID,
		"p_changed_by_user_id": changedByUserID,
		"p_new_start_date":     newStartDate,
		"p_new_end_date":       newEndDate,
	}
	jsonStr := client.Rpc("modify_reservation_dates_with_credits", "", params)
	if jsonStr == "" {
		return nil, types.NewInternalError("RPC returned empty response", nil)
	}
	if err := parseRPCMessageError(jsonStr); err != nil {
		return nil, err
	}
	var result types.ModifyDatesResponse
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, types.NewInternalError("Failed to parse modify result: "+jsonStr, err)
	}
	return &result, nil
}
