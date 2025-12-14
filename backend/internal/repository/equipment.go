package repository

import (
	"context"

	"magazyn/backend/internal/types"
)

// EquipmentRepository defines the interface for equipment data access
// This allows switching between different database implementations (Supabase, Postgres, Mock)
type EquipmentRepository interface {
	// List retrieves a paginated list of equipment based on filters
	List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error)

	// GetByID retrieves a single equipment by ID
	GetByID(ctx context.Context, id string) (*types.PublicEquipmentSelect, error)

	// GetTypeByID retrieves equipment type details
	GetTypeByID(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error)

	// GetInternalIDCheck checks if an internal ID already exists for a type
	GetInternalIDCheck(ctx context.Context, typeID string, internalID string) (bool, error)

	// Create creates a new equipment record
	Create(ctx context.Context, equipment types.PublicEquipmentInsert) (*types.PublicEquipmentSelect, error)

	// Update updates an existing equipment record
	Update(ctx context.Context, id string, equipment types.PublicEquipmentUpdate) (*types.PublicEquipmentSelect, error)

	// Archive sets the is_archived flag to true
	Archive(ctx context.Context, id string) error

	// GetTypeForEquipment loads the type information for a piece of equipment
	GetTypeForEquipment(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error)

	// GetMaintenanceLogs retrieves maintenance logs for equipment
	GetMaintenanceLogs(ctx context.Context, equipmentID string) ([]types.PublicMaintenanceLogsSelect, error)

	// GetMaintenanceLogsWithAdmin retrieves logs joined with admin profile
	GetMaintenanceLogsWithAdmin(ctx context.Context, equipmentID string) ([]MaintenanceLogWithAdmin, error)

	// GetActiveReservations checks for active reservations for equipment
	GetActiveReservations(ctx context.Context, equipmentID string) ([]types.PublicReservationsSelect, error)

	// GetConflictingReservations checks for reservations overlapping a date range
	GetConflictingReservations(ctx context.Context, equipmentID string, start string, end string) ([]types.PublicReservationsSelect, error)

	// GetEquipmentIDsWithConflicts returns IDs of equipment that have conflicting reservations
	// for the given date range. Only considers active reservations (PENDING, RENTED status).
	GetEquipmentIDsWithConflicts(ctx context.Context, startDate, endDate string) ([]string, error)

	// GetUserFavorites retrieves IDs of equipment that are user's favorites
	GetUserFavorites(ctx context.Context, userID string) (map[string]bool, error)
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
	// GetTypesByIDs retrieves multiple equipment types by their IDs
	GetTypesByIDs(ctx context.Context, ids []string) (map[string]types.PublicEquipmentTypesSelect, error)
}
