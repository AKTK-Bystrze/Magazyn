package supabase

import (
	"context"
	"encoding/json"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

func (r *reservationRepository) GetReservationByID(ctx context.Context, id string) (*types.ReservationDetail, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	selectStr := "*, profiles!user_id(username, email), equipment(name, internal_id, equipment_types(name, credit_cost_per_day))"
	data, _, err := client.From(constants.TableReservations).
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
	creditCost := validation.CalculateReservationCost(raw.StartDate, raw.EndDate, raw.Equipment.EquipmentType.CreditCostPerDay, raw.IsFree)
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
			IsFree:        raw.IsFree,
		},
		UserEmail:           raw.Profile.Email,
		EquipmentInternalID: raw.Equipment.InternalID,
		AuditTrail:          auditTrail,
	}
	return detail, nil
}

func (r *reservationRepository) getAuditTrail(ctx context.Context, reservationID string) ([]types.ReservationAuditEntry, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	selectStr := "*, profiles!changed_by_user_id(username)"
	data, _, err := client.From(constants.TableReservationHistory).
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
