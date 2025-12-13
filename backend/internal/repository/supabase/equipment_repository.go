package supabase

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/supabase-community/supabase-go"
)

type equipmentRepository struct {
	client *supabase.Client
}

// NewEquipmentRepository creates a new Supabase implementation of EquipmentRepository.
func NewEquipmentRepository(client *supabase.Client) repository.EquipmentRepository {
	return &equipmentRepository{
		client: client,
	}
}

// List retrieves a paginated list of equipment based on filters.
func (r *equipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error) {
	qb := r.client.From("equipment").Select("*", "exact", false)

	if !query.IncludeArchived {
		qb = qb.Eq("is_archived", "false")
	}
	if query.TypeID != nil && *query.TypeID != "" {
		qb = qb.Eq("type_id", *query.TypeID)
	}
	if query.Status != nil && *query.Status != "" {
		qb = qb.Eq("status", *query.Status)
	}
	if query.Search != nil && *query.Search != "" {
		searchTerm := *query.Search
		qb = qb.Or(fmt.Sprintf("name.ilike.%%%s%%,description.ilike.%%%s%%", searchTerm, searchTerm), "")
	}

	// Get count
	countData, _, err := qb.Execute()
	if err != nil {
		return nil, 0, err
	}

	var allItems []interface{} // simplified
	if err := json.Unmarshal(countData, &allItems); err != nil {
		return nil, 0, err
	}
	totalItems := int64(len(allItems))

	// Pagination
	offset := (query.Page - 1) * query.PerPage
	qb = qb.Range(offset, offset+query.PerPage-1, "")
	qb = qb.Order("name", nil)

	data, _, err := qb.Execute()
	if err != nil {
		return nil, 0, err
	}

	var equipment []types.PublicEquipmentSelect
	if err := json.Unmarshal(data, &equipment); err != nil {
		return nil, 0, err
	}

	return equipment, totalItems, nil
}

// GetByID retrieves a single equipment by ID
func (r *equipmentRepository) GetByID(ctx context.Context, id string) (*types.PublicEquipmentSelect, error) {
	data, _, err := r.client.From("equipment").
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

// GetTypeByID retrieves equipment type details
func (r *equipmentRepository) GetTypeByID(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error) {
	data, _, err := r.client.From("equipment_types").
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

// GetInternalIDCheck checks if an internal ID already exists for a type
func (r *equipmentRepository) GetInternalIDCheck(ctx context.Context, typeID string, internalID string) (bool, error) {
	data, _, err := r.client.From("equipment").
		Select("id", "exact", false).
		Eq("type_id", typeID).
		Eq("internal_id", internalID).
		Single().
		Execute()

	if err != nil {
		// Assume error means not found (or single row requirement failed which means 0 or >1)
		// If >1, it exists (duplicate). If 0, it doesn't.
		// We'll simplisticly assume error/empty implies not found.
		return false, nil
	}

	return len(data) > 2, nil
}

// Create creates a new equipment record
func (r *equipmentRepository) Create(ctx context.Context, equipment types.PublicEquipmentInsert) (*types.PublicEquipmentSelect, error) {
	data, _, err := r.client.From("equipment").
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

// Update updates an existing equipment record
func (r *equipmentRepository) Update(ctx context.Context, id string, equipment types.PublicEquipmentUpdate) (*types.PublicEquipmentSelect, error) {
	data, _, err := r.client.From("equipment").
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

	// Check if empty response (means ID not found or RLS blocked)
	if len(data) == 0 {
		return nil, types.NewNotFoundError("Equipment", id)
	}

	var updated types.PublicEquipmentSelect // Single() returns object
	if err := json.Unmarshal(data, &updated); err != nil {
		// Fallback if it returned array
		var updatedArr []types.PublicEquipmentSelect
		if err2 := json.Unmarshal(data, &updatedArr); err2 == nil && len(updatedArr) > 0 {
			return &updatedArr[0], nil
		}
		return nil, err
	}

	return &updated, nil
}

// Archive sets the is_archived flag to true
func (r *equipmentRepository) Archive(ctx context.Context, id string) error {
	archived := true
	updateData := types.PublicEquipmentUpdate{
		IsArchived: &archived,
	}

	_, _, err := r.client.From("equipment").
		Update(updateData, "", "").
		Eq("id", id).
		Execute()

	return err
}

// GetTypeForEquipment loads the type information for a piece of equipment
func (r *equipmentRepository) GetTypeForEquipment(ctx context.Context, typeID string) (*types.PublicEquipmentTypesSelect, error) {
	return r.GetTypeByID(ctx, typeID)
}

// GetMaintenanceLogs retrieves maintenance logs for equipment
func (r *equipmentRepository) GetMaintenanceLogs(ctx context.Context, equipmentID string) ([]types.PublicMaintenanceLogsSelect, error) {
	data, _, err := r.client.From("maintenance_logs").
		Select("*", "exact", false).
		Eq("equipment_id", equipmentID).
		Order("created_at", nil).
		Execute()

	if err != nil {
		return nil, err
	}

	var logs []types.PublicMaintenanceLogsSelect
	if err := json.Unmarshal(data, &logs); err != nil {
		return nil, err
	}
	return logs, nil
}

// GetMaintenanceLogsWithAdmin retrieves logs joined with admin profile
func (r *equipmentRepository) GetMaintenanceLogsWithAdmin(ctx context.Context, equipmentID string) ([]repository.MaintenanceLogWithAdmin, error) {
	data, _, err := r.client.From("maintenance_logs").
		Select("*, admin:profiles!admin_id(username)", "exact", false).
		Eq("equipment_id", equipmentID).
		Order("created_at", nil).
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

// GetActiveReservations checks for active reservations for equipment
func (r *equipmentRepository) GetActiveReservations(ctx context.Context, equipmentID string) ([]types.PublicReservationsSelect, error) {
	data, _, err := r.client.From("reservations").
		Select("*", "exact", false).
		Eq("equipment_id", equipmentID).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented}).
		Execute()

	if err != nil {
		return nil, err
	}

	var reservations []types.PublicReservationsSelect
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}
	return reservations, nil
}

// GetConflictingReservations checks for reservations overlapping a date range
func (r *equipmentRepository) GetConflictingReservations(ctx context.Context, equipmentID string, start string, end string) ([]types.PublicReservationsSelect, error) {
	data, _, err := r.client.From("reservations").
		Select("id, start_date, end_date, status", "exact", false).
		Eq("equipment_id", equipmentID).
		Lte("start_date", end).
		Gte("end_date", start).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented}).
		Execute()

	if err != nil {
		return nil, err
	}

	var reservations []types.PublicReservationsSelect
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}
	return reservations, nil
}

// GetUserFavorites retrieves IDs of equipment that are user's favorites
func (r *equipmentRepository) GetUserFavorites(ctx context.Context, userID string) (map[string]bool, error) {
	data, _, err := r.client.From("reservations").
		Select("equipment_id", "exact", false).
		Eq("user_id", userID).
		In("status", []string{constants.ReservationStatusRented, constants.ReservationStatusReturned}).
		Execute()

	if err != nil {
		return nil, err
	}

	var reservations []struct {
		EquipmentID string `json:"equipment_id"`
	}
	if err := json.Unmarshal(data, &reservations); err != nil {
		return nil, err
	}

	counts := make(map[string]int)
	for _, res := range reservations {
		counts[res.EquipmentID]++
	}

	favorites := make(map[string]bool)
	maxCount := 0
	for _, c := range counts {
		if c > maxCount {
			maxCount = c
		}
	}

	favCount := 0
	for eqID, c := range counts {
		if c == maxCount && favCount < 3 {
			favorites[eqID] = true
			favCount++
		}
	}

	return favorites, nil
}

// Helper to check for unique violation
func isUniqueViolation(err error) bool {
	// Check for Postgres error code 23505 (unique_violation)
	// or string matching if code is not directly accessible (Supabase-go wrapping)
	return err != nil && (strings.Contains(err.Error(), "duplicate key value") || strings.Contains(err.Error(), "23505"))
}
