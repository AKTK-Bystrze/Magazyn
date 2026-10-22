package supabase

import (
	"context"
	"encoding/json"
	"fmt"
	"slices"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"

	"github.com/supabase-community/postgrest-go"
)

func (r *equipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	baseQuery := client.From(constants.TableEquipment).
		Select("*", "exact", false).
		Order("created_at", &postgrest.OrderOpts{Ascending: false})
	if !query.IncludeArchived {
		baseQuery = baseQuery.Eq("is_archived", "false")
	}
	if query.TypeID != nil && *query.TypeID != "" {
		baseQuery = baseQuery.Eq("type_id", *query.TypeID)
	}
	if query.Status != nil && *query.Status != "" {
		baseQuery = baseQuery.Eq("status", *query.Status)
	}
	if query.Search != nil && *query.Search != "" {
		searchTerm := validation.SanitizeSearchTerm(*query.Search)
		baseQuery = baseQuery.Or(fmt.Sprintf("name.ilike.%%%s%%,description.ilike.%%%s%%", searchTerm, searchTerm), "")
	}
	var conflictIDs []string
	if query.AvailableFrom != nil && query.AvailableTo != nil {
		ids, err := r.getEquipmentIDsWithConflicts(ctx, *query.AvailableFrom, *query.AvailableTo)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to check equipment availability: %w", err)
		}
		conflictIDs = ids
		logger.Debugf(ctx, "Availability filter: %s to %s, found %d conflicting equipment IDs: %v",
			*query.AvailableFrom, *query.AvailableTo, len(conflictIDs), conflictIDs)
	}
	if len(conflictIDs) == 0 {
		offset := (query.Page - 1) * query.PerPage
		baseQuery = baseQuery.Range(offset, offset+query.PerPage-1, "")
		data, count, err := baseQuery.Execute()
		if err != nil {
			return nil, 0, err
		}
		var items []types.PublicEquipmentSelect
		if err := json.Unmarshal(data, &items); err != nil {
			return nil, 0, err
		}
		if items == nil {
			items = []types.PublicEquipmentSelect{}
		}
		return items, count, nil
	}

	countData, _, err := baseQuery.Execute()
	if err != nil {
		return nil, 0, err
	}
	var allItems []types.PublicEquipmentSelect
	if err := json.Unmarshal(countData, &allItems); err != nil {
		return nil, 0, err
	}
	paginatedItems, totalItems := filterAndPaginateEquipment(ctx, allItems, conflictIDs, query)
	return paginatedItems, totalItems, nil
}

func filterAndPaginateEquipment(ctx context.Context, allItems []types.PublicEquipmentSelect, conflictIDs []string, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64) {
	filteredItems := allItems
	if len(conflictIDs) > 0 {
		conflictSet := make(map[string]bool, len(conflictIDs))
		for _, id := range conflictIDs {
			conflictSet[id] = true
		}
		filteredItems = slices.DeleteFunc(slices.Clone(allItems), func(item types.PublicEquipmentSelect) bool {
			return conflictSet[item.ID]
		})
		logger.Debugf(ctx, "Filtered out %d unavailable equipment, %d remaining",
			len(allItems)-len(filteredItems), len(filteredItems))
	}
	totalItems := int64(len(filteredItems))
	offset := (query.Page - 1) * query.PerPage
	if len(filteredItems) > 0 {
		logger.Debugf(ctx, "List result: %d items. First: %v (%s), Last: %v (%s)",
			len(filteredItems), filteredItems[0].Name, filteredItems[0].CreatedAt,
			filteredItems[len(filteredItems)-1].Name, filteredItems[len(filteredItems)-1].CreatedAt)
	}
	endIndex := min(offset+query.PerPage, len(filteredItems))
	if offset >= len(filteredItems) {
		return []types.PublicEquipmentSelect{}, totalItems
	}
	return filteredItems[offset:endIndex], totalItems
}
