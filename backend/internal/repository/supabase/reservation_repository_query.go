package supabase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"

	postgrest "github.com/supabase-community/postgrest-go"
)

// unmarshalIDs extracts ID strings from raw JSON records containing an "id" field.
func unmarshalIDs(data []byte) ([]string, error) {
	var records []struct {
		ID string `json:"id"`
	}
	if err := json.Unmarshal(data, &records); err != nil {
		return nil, err
	}
	ids := make([]string, len(records))
	for i, r := range records {
		ids[i] = r.ID
	}
	return ids, nil
}

func (r *reservationRepository) GetReservations(ctx context.Context, query types.ReservationListQuery) ([]types.ReservationListItem, int64, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	selectStr := "*, profiles!user_id(username), equipment(name, equipment_types(name, credit_cost_per_day))"
	qb := client.From(constants.TableReservations).Select(selectStr, "exact", false)
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
	if query.TypeID != nil && *query.TypeID != "" {
		typeEqData, _, err := client.From(constants.TableEquipment).
			Select("id", "exact", false).
			Eq("type_id", *query.TypeID).
			Execute()
		if err != nil {
			return nil, 0, err
		}
		typeEqIDs, err := unmarshalIDs(typeEqData)
		if err != nil {
			return nil, 0, err
		}
		if len(typeEqIDs) == 0 {
			return []types.ReservationListItem{}, 0, nil
		}
		qb = qb.In("equipment_id", typeEqIDs)
	}
	if query.Search != nil && *query.Search != "" {
		searchTerm := validation.SanitizeSearchTerm(*query.Search)
		eqData, _, err := client.From(constants.TableEquipment).
			Select("id", "exact", false).
			Or(fmt.Sprintf("name.ilike.%%%s%%,internal_id.ilike.%%%s%%", searchTerm, searchTerm), "").
			Limit(50, "").
			Execute()
		if err != nil {
			return nil, 0, err
		}
		eqIDs, err := unmarshalIDs(eqData)
		if err != nil {
			return nil, 0, err
		}

		userData, _, err := client.From(constants.TableProfiles).
			Select("id", "exact", false).
			Or(fmt.Sprintf("username.ilike.%%%s%%", searchTerm), "").
			Limit(50, "").
			Execute()
		if err != nil {
			return nil, 0, err
		}
		userIDs, err := unmarshalIDs(userData)
		if err != nil {
			return nil, 0, err
		}

		hasEq := len(eqIDs) > 0
		hasUsers := len(userIDs) > 0
		if !hasEq && !hasUsers {
			return []types.ReservationListItem{}, 0, nil
		}

		if hasEq && hasUsers {
			qb = qb.Or(fmt.Sprintf("equipment_id.in.(%s),user_id.in.(%s)", strings.Join(eqIDs, ","), strings.Join(userIDs, ",")), "")
		} else if hasEq {
			qb = qb.In("equipment_id", eqIDs)
		} else {
			qb = qb.In("user_id", userIDs)
		}
	}
	offset := (query.Page - 1) * query.PerPage
	qb = qb.Range(offset, offset+query.PerPage-1, "")

	sortCol := "created_at"
	ascending := false
	isDateSort := false
	if query.Sort != nil && *query.Sort != "" {
		sortVal := *query.Sort
		ascending = strings.HasSuffix(sortVal, "_asc")
		if strings.HasPrefix(sortVal, "start_date") {
			sortCol = "start_date"
			isDateSort = true
		} else if strings.HasPrefix(sortVal, "end_date") {
			sortCol = "end_date"
			isDateSort = true
		}
	}
	qb = qb.Order(sortCol, &postgrest.OrderOpts{Ascending: ascending})
	if isDateSort {
		qb = qb.Order("created_at", &postgrest.OrderOpts{Ascending: false})
	}
	data, totalItems, err := qb.Execute()
	if err != nil {
		return nil, 0, err
	}
	var rawItems []joinedResponse
	if err := json.Unmarshal(data, &rawItems); err != nil {
		return nil, 0, err
	}
	result := make([]types.ReservationListItem, len(rawItems))
	for i, item := range rawItems {
		creditCost := validation.CalculateReservationCost(item.StartDate, item.EndDate, item.Equipment.EquipmentType.CreditCostPerDay, item.IsFree)
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
			IsFree:        item.IsFree,
		}
	}
	return result, totalItems, nil
}
