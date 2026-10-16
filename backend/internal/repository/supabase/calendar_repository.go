package supabase

import (
	"context"
	"encoding/json"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type calendarRepository struct {
	client *supabase.Client
}

func NewCalendarRepository(client *supabase.Client) repository.CalendarRepository {
	return &calendarRepository{
		client: client,
	}
}

func (r *calendarRepository) GetEquipmentForCalendar(ctx context.Context, equipmentID *string) ([]types.PublicEquipmentSelect, error) {
	qb := r.client.From(constants.TableEquipment).
		Select("*", "exact", false).
		Eq("is_archived", "false")
	if equipmentID != nil && *equipmentID != "" {
		qb = qb.Eq("id", *equipmentID)
	}
	qb = qb.Order("name", nil)
	data, _, err := qb.Execute()
	if err != nil {
		return nil, err
	}
	var equipment []types.PublicEquipmentSelect
	if err := json.Unmarshal(data, &equipment); err != nil {
		return nil, err
	}
	return equipment, nil
}

func (r *calendarRepository) GetReservationsInDateRange(ctx context.Context, startDate string, endDate string, equipmentID *string) ([]types.PublicReservationsSelect, error) {
	qb := r.client.From(constants.TableReservations).
		Select("*", "exact", false).
		Lte("start_date", endDate).
		Gte("end_date", startDate).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented})
	if equipmentID != nil && *equipmentID != "" {
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
