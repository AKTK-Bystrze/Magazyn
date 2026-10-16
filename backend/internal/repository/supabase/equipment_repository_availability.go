package supabase

import (
	"context"
	"encoding/json"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
)

func (r *equipmentRepository) GetActiveReservations(ctx context.Context, equipmentID string) ([]types.PublicReservationsSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableReservations).
		Select("*", "exact", false).
		Eq("equipment_id", equipmentID).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented}).
		Execute()
	if err != nil {
		return nil, err
	}
	var reservations []types.PublicReservationsSelect
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}
	return reservations, nil
}

func (r *equipmentRepository) GetConflictingReservations(ctx context.Context, equipmentID string, start string, end string) ([]types.PublicReservationsSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableReservations).
		Select("id, start_date, end_date, status", "exact", false).
		Eq("equipment_id", equipmentID).
		Lte("start_date", end).
		Gte("end_date", start).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented}).
		Execute()
	if err != nil {
		return nil, err
	}
	var reservations []types.PublicReservationsSelect
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}
	return reservations, nil
}

func (r *equipmentRepository) GetEquipmentIDsWithConflicts(ctx context.Context, startDate, endDate string) ([]string, error) {
	logger.Debugf(ctx, "GetEquipmentIDsWithConflicts called with: startDate=%s, endDate=%s", startDate, endDate)
	adminClient := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := adminClient.From(constants.TableReservations).
		Select("equipment_id, start_date, end_date, status", "exact", false).
		Lte("start_date", endDate).
		Gte("end_date", startDate).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented}).
		Execute()
	if err != nil {
		logger.Debugf(ctx, "Error querying reservations: %v", err)
		return nil, err
	}
	var reservations []struct {
		EquipmentID string `json:"equipment_id"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Status      string `json:"status"`
	}
	if err := json.Unmarshal(data, &reservations); err != nil {
		logger.Debugf(ctx, "Error unmarshaling reservations: %v", err)
		return nil, err
	}
	logger.Debugf(ctx, "Found %d overlapping reservations: %+v", len(reservations), reservations)
	seen := make(map[string]bool)
	var ids []string
	for _, r := range reservations {
		if !seen[r.EquipmentID] {
			seen[r.EquipmentID] = true
			ids = append(ids, r.EquipmentID)
		}
	}
	logger.Debugf(ctx, "Deduplicated to %d unique equipment IDs: %v", len(ids), ids)
	return ids, nil
}
