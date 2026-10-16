package supabase

import (
	"context"
	"encoding/json"
	"strings"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type equipmentRepository struct {
	client      *supabase.Client
	supabaseURL string
	supabaseKey string
}

func NewEquipmentRepository(client *supabase.Client, supabaseURL, supabaseKey string) repository.EquipmentRepository {
	return &equipmentRepository{
		client:      client,
		supabaseURL: supabaseURL,
		supabaseKey: supabaseKey,
	}
}

func (r *equipmentRepository) GetByID(ctx context.Context, id string) (*types.PublicEquipmentSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableEquipment).
		Select("*", "exact", false).
		Eq("id", id).
		Single().
		Execute()
	if err != nil || len(data) == 0 {
		return nil, types.NewNotFoundError("Equipment", id)
	}
	var item types.PublicEquipmentSelect
	if err := json.Unmarshal(data, &item); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *equipmentRepository) GetTypeByID(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error) {
	client := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := client.From(constants.TableEquipmentTypes).
		Select("*", "exact", false).
		Eq("id", typeID).
		Single().
		Execute()
	if err != nil || len(data) == 0 {
		return nil, types.NewNotFoundError("EquipmentType", typeID)
	}
	var item types.PublicEquipmentTypesSelect
	if err := json.Unmarshal(data, &item); err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *equipmentRepository) GetInternalIDCheck(ctx context.Context, typeID string, internalID string) (bool, error) {
	data, _, err := r.client.From(constants.TableEquipment).
		Select("id", "exact", false).
		Eq("type_id", typeID).
		Eq("internal_id", internalID).
		Single().
		Execute()
	if err != nil {
		return false, nil
	}
	return len(data) > 2, nil
}

func (r *equipmentRepository) Create(ctx context.Context, equipment types.PublicEquipmentInsert) (*types.PublicEquipmentSelect, error) {
	adminClient := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := adminClient.From(constants.TableEquipment).
		Insert(equipment, false, "", "representation", "").
		Single().
		Execute()
	if err != nil {
		if isUniqueViolation(err) {
			return nil, types.NewConflictError("Equipment with this internal ID or name already exists", err.Error())
		}
		return nil, err
	}
	var created types.PublicEquipmentSelect
	if err := json.Unmarshal(data, &created); err != nil {
		return nil, err
	}
	return &created, nil
}

func (r *equipmentRepository) Update(ctx context.Context, id string, equipment types.PublicEquipmentUpdate) (*types.PublicEquipmentSelect, error) {
	adminClient := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := adminClient.From(constants.TableEquipment).
		Update(equipment, "", "representation").
		Eq("id", id).
		Single().
		Execute()
	if err != nil {
		if isUniqueViolation(err) {
			return nil, types.NewConflictError("Equipment with this internal ID or name already exists", err.Error())
		}
		return nil, err
	}
	if len(data) == 0 {
		return nil, types.NewNotFoundError("Equipment", id)
	}
	var updated types.PublicEquipmentSelect
	if err := json.Unmarshal(data, &updated); err != nil {
		var updatedArr []types.PublicEquipmentSelect
		if err2 := json.Unmarshal(data, &updatedArr); err2 == nil && len(updatedArr) > 0 {
			return &updatedArr[0], nil
		}
		return nil, err
	}
	return &updated, nil
}

func (r *equipmentRepository) Archive(ctx context.Context, id string) error {
	adminClient := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	archived := true
	updateData := types.PublicEquipmentUpdate{
		IsArchived: &archived,
	}
	_, _, err := adminClient.From(constants.TableEquipment).
		Update(updateData, "", "").
		Eq("id", id).
		Execute()
	return err
}

func isUniqueViolation(err error) bool {
	return err != nil && (strings.Contains(err.Error(), "duplicate key value") || strings.Contains(err.Error(), "23505"))
}
