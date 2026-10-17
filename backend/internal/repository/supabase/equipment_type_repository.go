package supabase

import (
	"context"
	"encoding/json"
	"slices"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type equipmentTypeRepository struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

func NewEquipmentTypeRepository(client *supabase.Client, supabaseURL, supabaseKey string) repository.EquipmentTypeRepository {
	return &equipmentTypeRepository{
		client:      client,
		supabaseURL: supabaseURL,
		supabaseKey: supabaseKey,
	}
}
func (r *equipmentTypeRepository) ListAll(ctx context.Context) ([]types.PublicEquipmentTypesSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableEquipmentTypes).
		Select("*", "exact", false).
		Order("name", nil).
		Execute()
	if err != nil {
		return nil, err
	}
	var types []types.PublicEquipmentTypesSelect
	if err := json.Unmarshal(data, &types); err != nil {
		return nil, err
	}
	return types, nil
}
func (r *equipmentTypeRepository) GetTypesByIDs(ctx context.Context, ids []string) (map[string]types.PublicEquipmentTypesSelect, error) {
	if len(ids) == 0 {
		return make(map[string]types.PublicEquipmentTypesSelect), nil
	}
	uniqueIDs := slices.Clone(ids)
	slices.Sort(uniqueIDs)
	uniqueIDs = slices.Compact(uniqueIDs)
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableEquipmentTypes).
		Select("*", "exact", false).
		In("id", uniqueIDs).
		Execute()
	if err != nil {
		return nil, err
	}
	var typeList []types.PublicEquipmentTypesSelect
	if err := json.Unmarshal(data, &typeList); err != nil {
		return nil, err
	}
	result := make(map[string]types.PublicEquipmentTypesSelect)
	for _, t := range typeList {
		result[t.ID] = t
	}
	return result, nil
}
