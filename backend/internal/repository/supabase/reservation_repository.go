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
	client         *supabase.Client
	supabaseURL    string
	supabaseKey    string
	serviceRoleKey string
}

// NewReservationRepository creates a new Supabase implementation of ReservationRepository
func NewReservationRepository(client *supabase.Client, url string, key string, serviceRoleKey string) repository.ReservationRepository {
	return &reservationRepository{
		client:         client,
		supabaseURL:    url,
		supabaseKey:    key,
		serviceRoleKey: serviceRoleKey,
	}
}

// GetReservations retrieves a paginated list of reservations based on filters
func (r *reservationRepository) GetReservations(ctx context.Context, query types.ReservationListQuery) ([]types.ReservationListItem, int64, error) {
	// Use authenticated client for RLS enforcement, unless BypassRLS is set
	var client *supabase.Client
	var err error
	if query.BypassRLS && r.serviceRoleKey != "" {
		// Use service role client to bypass RLS for viewing all reservations
		client, err = supabase.NewClient(r.supabaseURL, r.serviceRoleKey, nil)
		if err != nil {
			logger.Warnf(ctx, "Failed to create service role client, falling back to auth client: %v", err)
			client = getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
		}
	} else {
		client = getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	}

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
		// Calculate credit cost: days * cost_per_day
		days := calculateDays(item.StartDate, item.EndDate)
		// days is always a small positive integer (1-365 range), safe to cast to int32
		creditCost := int32(days) * item.Equipment.EquipmentType.CreditCostPerDay //nolint:gosec // days is bounded

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

	selectStr := "*, profiles!user_id(username, email), equipment(name, internal_id, equipment_types(name))"

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
			Name string `json:"name"`
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
	data, _, err := r.client.From("reservations").
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
func (r *reservationRepository) CreateReservationsAtomic(ctx context.Context, userID string, totalCost int32, reservations []types.CreateReservationItem) ([]string, int32, error) {
	params := map[string]interface{}{
		"p_user_id":      userID,
		"p_total_cost":   totalCost,
		"p_reservations": reservations,
	}

	// Try accessing underlying Postgrest client if wrapper is weird.
	// r.client.DB... or r.client.Rest...
	// If I can't find it, I'll revert to r.client.Rpc and hope.
	// Let's try r.client.Rpc returns string, and we parses it.
	// If error occurs, maybe the string is the error JSON?

	// Debug params
	paramBytes, _ := json.Marshal(params)
	logger.Infof(ctx, "RPC Params: %s", string(paramBytes))

	// Temporarily:
	jsonStr := r.client.Rpc("create_reservation_atomic", "", params)
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

// UpdateReservation updates an existing reservation
func (r *reservationRepository) UpdateReservation(ctx context.Context, id string, reservation types.PublicReservationsUpdate) (*types.PublicReservationsSelect, error) {
	data, _, err := r.client.From("reservations").
		Update(reservation, "", "").
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		return nil, err
	}

	if len(data) == 0 {
		return nil, types.NewNotFoundError("Reservation", id)
	}

	var updated types.PublicReservationsSelect
	if err := json.Unmarshal(data, &updated); err != nil {
		var updatedArr []types.PublicReservationsSelect
		if err2 := json.Unmarshal(data, &updatedArr); err2 == nil && len(updatedArr) > 0 {
			return &updatedArr[0], nil
		}
		return nil, err
	}

	return &updated, nil
}

// BulkUpdateReservations updates the status of multiple reservations
func (r *reservationRepository) BulkUpdateReservations(ctx context.Context, ids []string, status string) error {
	updateData := types.PublicReservationsUpdate{
		Status: &status,
	}

	_, _, err := r.client.From("reservations").
		Update(updateData, "", "").
		In("id", ids).
		Execute()

	return err
}

// GetOverlappingReservations checks if there are any approved/pending reservations for the given equipment in the date range.
func (r *reservationRepository) GetOverlappingReservations(ctx context.Context, equipmentID string, startDate string, endDate string, excludeReservationID *string) ([]types.PublicReservationsSelect, error) {
	qb := r.client.From("reservations").
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
	// Pending
	_, pCount, err := r.client.From("reservations").Select("*", "exact", true).Eq("status", constants.ReservationStatusPending).Execute()
	if err != nil {
		return nil, err
	}

	now := time.Now().Format("2006-01-02")
	// Overdue
	_, oCount, err := r.client.From("reservations").
		Select("*", "exact", true).
		Eq("status", constants.ReservationStatusRented).
		Lt("end_date", now).
		Execute()
	if err != nil {
		return nil, err
	}

	// Active Today
	_, aCount, err := r.client.From("reservations").
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
	qb := r.client.From("reservations").
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
	params := map[string]interface{}{
		"p_reservation_id": reservationID,
		"p_amount":         amount,
	}
	// RPC returns the response body as string
	// TODO: Parse response to check for errors properly if library supports it.
	_ = r.client.Rpc("refund_reservation_credits", "", params)
	return nil
}
