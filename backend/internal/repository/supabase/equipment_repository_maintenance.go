package supabase

import (
	"context"
	"encoding/json"
	"fmt"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/postgrest-go"
)

func (r *equipmentRepository) GetMaintenanceLogsWithAdmin(ctx context.Context, equipmentID string) ([]repository.MaintenanceLogWithAdmin, error) {
	adminClient := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	data, _, err := adminClient.From(constants.TableMaintenanceLogs).
		Select("*, admin:profiles!admin_id(username)", "exact", false).
		Eq("equipment_id", equipmentID).
		Order("created_at", &postgrest.OrderOpts{Ascending: false}).
		Execute()
	if err != nil {
		return nil, err
	}
	var rawLogs []struct {
		types.PublicMaintenanceLogsSelect
		Admin struct {
			Username string `json:"username"`
		} `json:"admin"`
	}
	if err := json.Unmarshal(data, &rawLogs); err != nil {
		return nil, err
	}
	result := make([]repository.MaintenanceLogWithAdmin, len(rawLogs))
	for i, log := range rawLogs {
		result[i] = repository.MaintenanceLogWithAdmin{
			PublicMaintenanceLogsSelect: log.PublicMaintenanceLogsSelect,
			AdminUsername:               log.Admin.Username,
		}
	}
	return result, nil
}

func (r *equipmentRepository) CreateMaintenanceLog(ctx context.Context, equipmentID string, previousStatus, newStatus string, notes *string, userID string) (*types.PublicMaintenanceLogsSelect, error) {
	adminClient := getClientWithAuth(ctx, r.client, r.supabaseURL, r.supabaseKey)
	insert := types.PublicMaintenanceLogsInsert{
		EquipmentID:    equipmentID,
		PreviousStatus: &previousStatus,
		NewStatus:      newStatus,
		Notes:          notes,
		AdminID:        &userID,
	}
	data, _, err := adminClient.From(constants.TableMaintenanceLogs).
		Insert(insert, false, "", "representation", "").
		Single().
		Execute()
	if err != nil {
		return nil, fmt.Errorf("failed to create maintenance log: %w", err)
	}
	var log types.PublicMaintenanceLogsSelect
	if err := json.Unmarshal(data, &log); err != nil {
		return nil, fmt.Errorf("failed to unmarshal maintenance log: %w", err)
	}
	return &log, nil
}
