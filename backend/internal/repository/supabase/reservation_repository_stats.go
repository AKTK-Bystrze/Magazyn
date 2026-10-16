package supabase

import (
	"context"
	"encoding/json"
	"time"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
)

func (r *reservationRepository) GetOverlappingReservations(ctx context.Context, equipmentID string, startDate string, endDate string, excludeReservationID *string) ([]types.PublicReservationsSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	qb := client.From(constants.TableReservations).
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

func (r *reservationRepository) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	_, pCount, err := client.From(constants.TableReservations).Select("*", "exact", true).Eq("status", constants.ReservationStatusPending).Execute()
	if err != nil {
		return nil, err
	}
	now := time.Now().Format(constants.DateFormatISO)
	_, oCount, err := client.From(constants.TableReservations).
		Select("*", "exact", true).
		Eq("status", constants.ReservationStatusRented).
		Lt("end_date", now).
		Execute()
	if err != nil {
		return nil, err
	}
	_, aCount, err := client.From(constants.TableReservations).
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
