package supabase

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type reservationRepository struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

// NewReservationRepository creates a new Supabase implementation of ReservationRepository
func NewReservationRepository(client *supabase.Client, url string, key string) repository.ReservationRepository {
	return &reservationRepository{
		client:      client,
		supabaseURL: url,
		supabaseKey: key,
	}
}

// GetReservations retrieves a paginated list of reservations based on filters
func (r *reservationRepository) GetReservations(ctx context.Context, query types.ReservationListQuery) ([]types.ReservationListItem, int64, error) {
	// Use authenticated client for RLS enforcement
	// Admin access is now handled by RLS policies
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	// Select basics + joined data including credit_cost_per_day for calculation
	selectStr := "*, profiles!user_id(username), equipment(name, equipment_types(name, credit_cost_per_day))"

	qb := client.From("reservations").Select(selectStr, "exact", false)

	if query.Status != nil && *query.Status != "" {
		qb = qb.Eq("status", *query.Status)
	}
	if query.UserID != nil && *query.UserID != "" {
		qb = qb.Eq("user_id", *query.UserID)
	}
	if query.EquipmentID != nil && *query.EquipmentID != "" {
		qb = qb.Eq("equipment_id", *query.EquipmentID)
	}
	if query.StartDateFrom != nil && *query.StartDateFrom != "" {
		qb = qb.Gte("start_date", *query.StartDateFrom)
	}
	if query.StartDateTo != nil && *query.StartDateTo != "" {
		qb = qb.Lte("start_date", *query.StartDateTo)
	}

	// Calculate offset
	offset := (query.Page - 1) * query.PerPage

	// Get total count
	countData, _, err := qb.Execute()
	if err != nil {
		return nil, 0, err
	}
	// The response from Execute with "exact" count option in Select isn't straightforwardly mapped to countData length if paginated later.
	// However, here we haven't paginated yet, so length is total count.
	var countHolder []interface{}
	if err := json.Unmarshal(countData, &countHolder); err != nil {
		return nil, 0, err
	}
	totalItems := int64(len(countHolder))

	// Pagination & Order
	qb = qb.Range(offset, offset+query.PerPage-1, "")
	qb = qb.Order("created_at", nil)

	data, _, err := qb.Execute()
	if err != nil {
		return nil, 0, err
	}

	// Temp struct for unmarshalling nested response
	var rawItems []joinedResponse
	if err := json.Unmarshal(data, &rawItems); err != nil {
		return nil, 0, err
	}

	// Map to ListItem
	result := make([]types.ReservationListItem, len(rawItems))
	for i, item := range rawItems {
		// Calculate credit cost: 0 if free, otherwise days * cost_per_day
		var creditCost int32
		if item.IsFree {
			creditCost = 0
		} else {
			days := calculateDays(item.StartDate, item.EndDate)
			// days is always a small positive integer (1-365 range), safe to cast to int32
			creditCost = int32(days) * item.Equipment.EquipmentType.CreditCostPerDay //nolint:gosec // days is bounded
		}

		result[i] = types.ReservationListItem{
			ID:            item.ID,
			UserID:        item.UserID,
			Username:      item.Profile.Username,
			EquipmentID:   item.EquipmentID,
			EquipmentName: item.Equipment.Name,
			EquipmentType: item.Equipment.EquipmentType.Name,
			StartDate:     item.StartDate,
			EndDate:       item.EndDate,
			Status:        item.Status,
			CreditCost:    creditCost,
			CreatedAt:     item.CreatedAt,
			UpdatedAt:     item.UpdatedAt,
		}
	}

	return result, totalItems, nil
}

// GetReservationByID retrieves a single reservation with full details by ID
func (r *reservationRepository) GetReservationByID(ctx context.Context, id string) (*types.ReservationDetail, error) {
	// Use authenticated client for RLS enforcement
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	selectStr := "*, profiles!user_id(username, email), equipment(name, internal_id, equipment_types(name, credit_cost_per_day))"

	data, _, err := client.From("reservations").
		Select(selectStr, "exact", false).
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		return nil, types.NewNotFoundError("Reservation", id)
	}

	var raw detailResponse
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil, err
	}

	auditTrail, err := r.getAuditTrail(ctx, id)
	if err != nil {
		return nil, err
	}

	// Calculate credit cost: 0 if free, otherwise days * cost_per_day (same logic as list view)
	var creditCost int32
	if raw.IsFree {
		creditCost = 0
	} else {
		days := calculateDays(raw.StartDate, raw.EndDate)
		creditCost = int32(days) * raw.Equipment.EquipmentType.CreditCostPerDay //nolint:gosec // days is bounded
	}

	detail := &types.ReservationDetail{
		ReservationListItem: types.ReservationListItem{
			ID:            raw.ID,
			UserID:        raw.UserID,
			Username:      raw.Profile.Username,
			EquipmentID:   raw.EquipmentID,
			EquipmentName: raw.Equipment.Name,
			EquipmentType: raw.Equipment.EquipmentType.Name,
			StartDate:     raw.StartDate,
			EndDate:       raw.EndDate,
			Status:        raw.Status,
			CreditCost:    creditCost,
			CreatedAt:     raw.CreatedAt,
			UpdatedAt:     raw.UpdatedAt,
		},
		UserEmail:           raw.Profile.Email,
		EquipmentInternalID: raw.Equipment.InternalID,
		AuditTrail:          auditTrail,
	}

	return detail, nil
}

func (r *reservationRepository) getAuditTrail(ctx context.Context, reservationID string) ([]types.ReservationAuditEntry, error) {
	// Use authenticated client for RLS enforcement
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	selectStr := "*, profiles!changed_by_user_id(username)"
	data, _, err := client.From("reservation_history").
		Select(selectStr, "exact", false).
		Eq("reservation_id", reservationID).
		Order("created_at", nil).
		Execute()

	if err != nil {
		return nil, err
	}

	var activeRaw []auditRaw
	if err := json.Unmarshal(data, &activeRaw); err != nil {
		return nil, err
	}

	result := make([]types.ReservationAuditEntry, len(activeRaw))
	for i, item := range activeRaw {
		username := item.Profile.Username
		result[i] = types.ReservationAuditEntry{
			ID:                item.ID,
			StartDate:         item.StartDate,
			EndDate:           item.EndDate,
			Status:            item.Status,
			ChangedByUsername: &username,
			CreatedAt:         item.CreatedAt,
		}
	}
	return result, nil
}

// ===================================
// Private Types for Data Mapping
// ===================================

type joinedResponse struct {
	types.PublicReservationsSelect
	Profile struct {
		Username string `json:"username"`
	} `json:"profiles"`
	Equipment struct {
		Name          string `json:"name"`
		EquipmentType struct {
			Name             string `json:"name"`
			CreditCostPerDay int32  `json:"credit_cost_per_day"`
		} `json:"equipment_types"`
	} `json:"equipment"`
}

type detailResponse struct {
	types.PublicReservationsSelect
	Profile struct {
		Username string `json:"username"`
		Email    string `json:"email"`
	} `json:"profiles"`
	Equipment struct {
		Name          string `json:"name"`
		InternalID    string `json:"internal_id"`
		EquipmentType struct {
			Name             string `json:"name"`
			CreditCostPerDay int32  `json:"credit_cost_per_day"`
		} `json:"equipment_types"`
	} `json:"equipment"`
}

type auditRaw struct {
	types.PublicReservationHistorySelect
	Profile struct {
		Username string `json:"username"`
	} `json:"profiles"`
}

// CreateReservation creates a new reservation record
func (r *reservationRepository) CreateReservation(ctx context.Context, reservation types.PublicReservationsInsert) (*types.PublicReservationsSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	data, _, err := client.From("reservations").
		Insert(reservation, false, "", "", "").
		Single().
		Execute()

	if err != nil {
		return nil, err
	}

	var created types.PublicReservationsSelect
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}

	return &created, nil
}

// CreateReservationsAtomic creates multiple reservations and deducts credits atomically
func (r *reservationRepository) CreateReservationsAtomic(ctx context.Context, userID string, totalCost int32, isFree bool, createdByUserID string, reservations []types.CreateReservationItem) ([]string, int32, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	params := map[string]interface{}{
		"p_user_id":            userID,
		"p_total_cost":         totalCost,
		"p_is_free":            isFree,
		"p_created_by_user_id": createdByUserID,
		"p_reservations":       reservations,
	}

	// Debug params
	paramBytes, _ := json.Marshal(params)
	logger.Infof(ctx, "RPC Params: %s", string(paramBytes))

	// Temporarily:
	jsonStr := client.Rpc("create_reservation_atomic", "", params)
	logger.Infof(ctx, "RPC Response: %s", jsonStr)

	var result struct {
		ReservationIDs []string `json:"reservation_ids"`
		NewBalance     int32    `json:"new_balance"`
	}
	// Check for empty string?
	if jsonStr == "" {
		return nil, 0, types.NewInternalError("RPC returned empty response", nil)
	}

	// Check for error in response
	var rawResponse map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err != nil {
		return nil, 0, types.NewInternalError("Failed to parse RPC response: "+jsonStr, err)
	}

	if msg, ok := rawResponse["message"]; ok {
		// If message exists, it's likely an error (unless it's part of success, but our success is object with ids)
		// Supabase errors usually have 'message' and 'code'.
		// Our success object has 'reservation_ids' and 'new_balance'.
		// Check against keys we expect.
		if _, hasIDs := rawResponse["reservation_ids"]; !hasIDs {
			// It is an error
			return nil, 0, types.NewConflictError(fmt.Sprintf("%v", msg), nil)
		}
	}
	// Also check "error" key just in case
	if errVal, ok := rawResponse["error"]; ok {
		return nil, 0, types.NewInternalError(fmt.Sprintf("RPC Error: %v", errVal), nil)
	}

	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, 0, types.NewInternalError("RPC failed to map result: "+jsonStr, err)
	}

	return result.ReservationIDs, result.NewBalance, nil
}

// UpdateReservation updates an existing reservation using RPC for proper audit trail
func (r *reservationRepository) UpdateReservation(ctx context.Context, id string, reservation types.PublicReservationsUpdate, changedByUserID string) (*types.PublicReservationsSelect, error) {
	// Use auth client - RLS policies map permissions
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	// Build RPC params
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

	// Check for error in response
	var rawResponse map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err != nil {
		return nil, types.NewInternalError("Failed to parse RPC response: "+jsonStr, err)
	}

	if msg, ok := rawResponse["message"]; ok {
		// It's an error
		return nil, types.NewInternalError(fmt.Sprintf("%v", msg), nil)
	}

	// Parse successful response
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

// BulkUpdateStatusAtomic updates the status of multiple reservations and handles refunds atomically via RPC
func (r *reservationRepository) BulkUpdateStatusAtomic(ctx context.Context, ids []string, status string, adminID string) (*types.BulkStatusUpdateResponse, error) {
	// Use auth client - RLS policies map permissions
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

	// Check for error in response
	var rawResponse map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err != nil {
		return nil, types.NewInternalError("Failed to parse RPC response: "+jsonStr, err)
	}

	if msg, ok := rawResponse["message"]; ok {
		return nil, types.NewInternalError(fmt.Sprintf("%v", msg), nil)
	}

	var result types.BulkStatusUpdateResponse
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, types.NewInternalError("Failed to parse bulk update result: "+jsonStr, err)
	}

	return &result, nil
}

// BulkUpdateReservations updates the status of multiple reservations
func (r *reservationRepository) BulkUpdateReservations(ctx context.Context, ids []string, status string) error {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	updateData := types.PublicReservationsUpdate{
		Status: &status,
	}

	_, _, err := client.From("reservations").
		Update(updateData, "", "").
		In("id", ids).
		Execute()

	return err
}

// GetOverlappingReservations checks if there are any approved/pending reservations for the given equipment in the date range.
func (r *reservationRepository) GetOverlappingReservations(ctx context.Context, equipmentID string, startDate string, endDate string, excludeReservationID *string) ([]types.PublicReservationsSelect, error) {
	// Use auth client - RLS policies map permissions
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	qb := client.From("reservations").
		Select("*", "exact", false).
		Eq("equipment_id", equipmentID).
		Lte("start_date", endDate).
		Gte("end_date", startDate).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented})

	if excludeReservationID != nil {
		qb = qb.Neq("id", *excludeReservationID)
	}

	data, _, err := qb.Execute()

	if err != nil {
		return nil, err
	}

	var reservations []types.PublicReservationsSelect
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}

	return reservations, nil
}

// GetDashboardStats retrieves summary statistics for the admin dashboard
func (r *reservationRepository) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
	// Admin only, should have auth
	// RLS policies now ensure complete data visibility for admin role
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	// Pending
	_, pCount, err := client.From("reservations").Select("*", "exact", true).Eq("status", constants.ReservationStatusPending).Execute()
	if err != nil {
		return nil, err
	}

	now := time.Now().Format("2006-01-02")
	// Overdue
	_, oCount, err := client.From("reservations").
		Select("*", "exact", true).
		Eq("status", constants.ReservationStatusRented).
		Lt("end_date", now).
		Execute()
	if err != nil {
		return nil, err
	}

	// Active Today
	_, aCount, err := client.From("reservations").
		Select("*", "exact", true).
		Eq("status", constants.ReservationStatusRented).
		Lte("start_date", now).
		Gte("end_date", now).
		Execute()
	if err != nil {
		return nil, err
	}

	return &types.ReservationDashboardSummary{
		PendingReservations: pCount,
		OverdueReservations: oCount,
		ActiveToday:         aCount,
	}, nil
}

// GetReservationsInRange retrieves reservations overlapping standard range
func (r *reservationRepository) GetReservationsInRange(ctx context.Context, rangeStart string, rangeEnd string, equipmentID *string) ([]types.PublicReservationsSelect, error) {
	// Availability check - usually public, but let's stick to auth client if available
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	qb := client.From("reservations").
		Select("*", "exact", false).
		Lte("start_date", rangeEnd).
		Gte("end_date", rangeStart).
		Neq("status", constants.ReservationStatusDenied).
		Neq("status", "CANCELLED")

	if equipmentID != nil {
		qb = qb.Eq("equipment_id", *equipmentID)
	}

	data, _, err := qb.Execute()
	if err != nil {
		return nil, err
	}

	var reservations []types.PublicReservationsSelect
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}
	return reservations, nil
}

// RefundCredits refunds credits to the user for a cancelled reservation
func (r *reservationRepository) RefundCredits(ctx context.Context, reservationID string, amount int32) error {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)

	params := map[string]interface{}{
		"p_reservation_id": reservationID,
		"p_amount":         amount,
	}
	// RPC returns the response body as string
	// TODO: Parse response to check for errors properly if library supports it.
	_ = client.Rpc("refund_reservation_credits", "", params)
	return nil
}

// ModifyReservationDatesWithCredits modifies reservation dates and adjusts credits atom ically
func (r *reservationRepository) ModifyReservationDatesWithCredits(ctx context.Context, reservationID string, changedByUserID string, newStartDate string, newEndDate string) (*types.ModifyDatesResponse, error) {
	// Use auth client
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

	// Check for error in response
	var rawResponse map[string]interface{}
	if err := json.Unmarshal([]byte(jsonStr), &rawResponse); err != nil {
		return nil, types.NewInternalError("Failed to parse RPC response: "+jsonStr, err)
	}

	// Check for error message
	if msg, ok := rawResponse["message"]; ok {
		// Error response from database
		return nil, types.NewInternalError(fmt.Sprintf("%v", msg), nil)
	}

	// Parse successful response
	var result types.ModifyDatesResponse
	if err := json.Unmarshal([]byte(jsonStr), &result); err != nil {
		return nil, types.NewInternalError("Failed to parse modify result: "+jsonStr, err)
	}

	return &result, nil
}
