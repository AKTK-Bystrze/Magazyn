package mocks

import (
	"context"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockEquipmentRepository implements repository.EquipmentRepository
type MockEquipmentRepository struct {
	mock.Mock
}

// Ensure mock implements interface
var _ repository.EquipmentRepository = (*MockEquipmentRepository)(nil)

func (m *MockEquipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error) {
	args := m.Called(ctx, query)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]types.PublicEquipmentSelect), args.Get(1).(int64), args.Error(2)
}

func (m *MockEquipmentRepository) GetByID(ctx context.Context, id string) (*types.PublicEquipmentSelect, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetTypeByID(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error) {
	args := m.Called(ctx, typeID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentTypesSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetInternalIDCheck(ctx context.Context, typeID string, internalID string) (bool, error) {
	args := m.Called(ctx, typeID, internalID)
	return args.Bool(0), args.Error(1)
}

func (m *MockEquipmentRepository) Create(ctx context.Context, equipment types.PublicEquipmentInsert) (*types.PublicEquipmentSelect, error) {
	args := m.Called(ctx, equipment)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockEquipmentRepository) Update(ctx context.Context, id string, equipment types.PublicEquipmentUpdate) (*types.PublicEquipmentSelect, error) {
	args := m.Called(ctx, id, equipment)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentSelect), args.Error(1)
}

func (m *MockEquipmentRepository) Archive(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockEquipmentRepository) GetTypeForEquipment(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error) {
	args := m.Called(ctx, typeID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicEquipmentTypesSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetMaintenanceLogs(ctx context.Context, equipmentID string) ([]types.PublicMaintenanceLogsSelect, error) {
	args := m.Called(ctx, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicMaintenanceLogsSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetMaintenanceLogsWithAdmin(ctx context.Context, equipmentID string) ([]repository.MaintenanceLogWithAdmin, error) {
	args := m.Called(ctx, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]repository.MaintenanceLogWithAdmin), args.Error(1)
}

func (m *MockEquipmentRepository) GetActiveReservations(ctx context.Context, equipmentID string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, equipmentID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetConflictingReservations(ctx context.Context, equipmentID string, start string, end string) ([]types.PublicReservationsSelect, error) {
	args := m.Called(ctx, equipmentID, start, end)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]types.PublicReservationsSelect), args.Error(1)
}

func (m *MockEquipmentRepository) GetEquipmentIDsWithConflicts(ctx context.Context, startDate, endDate string) ([]string, error) {
	args := m.Called(ctx, startDate, endDate)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]string), args.Error(1)
}

func (m *MockEquipmentRepository) GetUserFavorites(ctx context.Context, userID string) (map[string]bool, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]bool), args.Error(1)
}

func (m *MockEquipmentRepository) CreateMaintenanceLog(ctx context.Context, equipmentID string, previousStatus, newStatus string, notes *string, userID string) (*types.PublicMaintenanceLogsSelect, error) {
	args := m.Called(ctx, equipmentID, previousStatus, newStatus, notes, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicMaintenanceLogsSelect), args.Error(1)
}
