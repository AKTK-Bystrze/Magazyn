package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// EquipmentRepository defines the interface for equipment data access
// This allows switching between different database implementations (Supabase, Postgres, Mock)
type EquipmentRepository interface {
	List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error)

	GetByID(ctx context.Context, id string) (*types.PublicEquipmentSelect, error)

	GetTypeByID(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error)

	GetInternalIDCheck(ctx context.Context, typeID string, internalID string) (bool, error)

	Create(ctx context.Context, equipment types.PublicEquipmentInsert) (*types.PublicEquipmentSelect, error)

	Update(ctx context.Context, id string, equipment types.PublicEquipmentUpdate) (*types.PublicEquipmentSelect, error)

	Archive(ctx context.Context, id string) error

	GetTypeForEquipment(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error)

	GetMaintenanceLogs(ctx context.Context, equipmentID string) ([]types.PublicMaintenanceLogsSelect, error)

	GetMaintenanceLogsWithAdmin(ctx context.Context, equipmentID string) ([]MaintenanceLogWithAdmin, error)

	GetActiveReservations(ctx context.Context, equipmentID string) ([]types.PublicReservationsSelect, error)

	GetConflictingReservations(ctx context.Context, equipmentID string, start string, end string) ([]types.PublicReservationsSelect, error)

	GetEquipmentIDsWithConflicts(ctx context.Context, startDate, endDate string) ([]string, error)

	GetUserFavorites(ctx context.Context, userID string) (map[string]bool, error)

	CreateMaintenanceLog(ctx context.Context, equipmentID string, previousStatus, newStatus string, notes *string, userID string) (*types.PublicMaintenanceLogsSelect, error)
}

// MaintenanceLogWithAdmin extends the log with admin username
type MaintenanceLogWithAdmin struct {
	types.PublicMaintenanceLogsSelect
	AdminUsername string
}

// EquipmentTypeRepository defines the interface for equipment type management
type EquipmentTypeRepository interface {
	ListAll(ctx context.Context) ([]types.PublicEquipmentTypesSelect, error)
	Create(ctx context.Context, et types.PublicEquipmentTypesInsert) (*types.PublicEquipmentTypesSelect, error)
	GetTypesByIDs(ctx context.Context, ids []string) (map[string]types.PublicEquipmentTypesSelect, error)
}
