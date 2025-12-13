package supabase

import (
	"context"
	"encoding/json"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type equipmentTypeRepository struct {
	client *supabase.Client
}

// NewEquipmentTypeRepository creates a new Supabase implementation of EquipmentTypeRepository
func NewEquipmentTypeRepository(client *supabase.Client) repository.EquipmentTypeRepository {
	return &equipmentTypeRepository{
		client: client,
	}
}

func (r *equipmentTypeRepository) ListAll(ctx context.Context) ([]types.PublicEquipmentTypesSelect, error) {
	data, _, err := r.client.From("equipment_types").
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

func (r *equipmentTypeRepository) Create(ctx context.Context, et types.PublicEquipmentTypesInsert) (*types.PublicEquipmentTypesSelect, error) {
	data, _, err := r.client.From("equipment_types").
		Insert(et, false, "", "representation", "").
		Single().
		Execute()

	if err != nil {
		return nil, err
	}

	var created types.PublicEquipmentTypesSelect
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}

	return &created, nil
}

func (r *equipmentTypeRepository) GetTypesByIDs(ctx context.Context, ids []string) (map[string]types.PublicEquipmentTypesSelect, error) {
	if len(ids) == 0 {
		return make(map[string]types.PublicEquipmentTypesSelect), nil
	}

	// Remove duplicates
	uniqueIDs := make([]string, 0, len(ids))
	seen := make(map[string]bool)
	for _, id := range ids {
		if !seen[id] {
			seen[id] = true
			uniqueIDs = append(uniqueIDs, id)
		}
	}

	// Supabase (Postgrest) "in" filter format: (id1,id2,id3)
	// Note: supabase-go might handle slice for In directly?
	// Looking at previous usages like `In("status", []string{...})`, it seems supported.

	// We'll use In filter.
	data, _, err := r.client.From("equipment_types").
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
