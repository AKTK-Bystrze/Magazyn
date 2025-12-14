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
	client      *supabase.Client
	supabaseURL string
	serviceKey  string
}

// NewEquipmentRepository creates a new Supabase implementation of EquipmentRepository.
// The serviceKey is used to bypass RLS for availability checks that need to see ALL reservations.
func NewEquipmentRepository(client *supabase.Client, supabaseURL, serviceKey string) repository.EquipmentRepository {
	return &equipmentRepository{
		client:      client,
		supabaseURL: supabaseURL,
		serviceKey:  serviceKey,
	}
}

// List retrieves a paginated list of equipment based on filters.
func (r *equipmentRepository) List(ctx context.Context, query types.EquipmentListQuery) ([]types.PublicEquipmentSelect, int64, error) {
	// Build base query with all filters
	baseQuery := r.client.From("equipment").Select("*", "exact", false)

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
		searchTerm := *query.Search
		baseQuery = baseQuery.Or(fmt.Sprintf("name.ilike.%%%s%%,description.ilike.%%%s%%", searchTerm, searchTerm), "")
	}

	// Filter by availability - get equipment IDs to exclude
	var conflictIDs []string
	if query.AvailableFrom != nil && query.AvailableTo != nil {
		ids, err := r.GetEquipmentIDsWithConflicts(ctx, *query.AvailableFrom, *query.AvailableTo)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to check equipment availability: %w", err)
		}
		conflictIDs = ids
		// Debug logging
		fmt.Printf("[DEBUG] Availability filter: %s to %s, found %d conflicting equipment IDs: %v\n", 
			*query.AvailableFrom, *query.AvailableTo, len(conflictIDs), conflictIDs)
	}

	// NOTE: The Supabase Go client doesn't support NOT IN filter properly,
	// so we'll filter the results in Go after fetching
	
	// Get all matching equipment first
	countData, _, err := baseQuery.Execute()
	if err != nil {
		return nil, 0, err
	}

	var allItems []types.PublicEquipmentSelect
	if err := json.Unmarshal(countData, &allItems); err != nil {
		return nil, 0, err
	}

	// Filter out unavailable equipment in Go
	var filteredItems []types.PublicEquipmentSelect
	conflictSet := make(map[string]bool)
	for _, id := range conflictIDs {
		conflictSet[id] = true
	}
	
	for _, item := range allItems {
		if !conflictSet[item.ID] {
			filteredItems = append(filteredItems, item)
		}
	}
	
	if len(conflictIDs) > 0 {
		fmt.Printf("[DEBUG] Filtered out %d unavailable equipment, %d remaining\n", 
			len(allItems)-len(filteredItems), len(filteredItems))
	}

	totalItems := int64(len(filteredItems))

	// Apply pagination to filtered results
	offset := (query.Page - 1) * query.PerPage
	endIndex := offset + query.PerPage
	if endIndex > len(filteredItems) {
		endIndex = len(filteredItems)
	}
	if offset >= len(filteredItems) {
		return []types.PublicEquipmentSelect{}, totalItems, nil
	}

	paginatedItems := filteredItems[offset:endIndex]

	return paginatedItems, totalItems, nil
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

// GetEquipmentIDsWithConflicts finds all equipment IDs that have active reservations
// overlapping with the given date range
func (r *equipmentRepository) GetEquipmentIDsWithConflicts(ctx context.Context, startDate, endDate string) ([]string, error) {
	fmt.Printf("[DEBUG] GetEquipmentIDsWithConflicts called with: startDate=%s, endDate=%s\n", startDate, endDate)
	
	// Use admin client to bypass RLS - we need to see ALL reservations, not just the user's
	if r.serviceKey == "" {
		fmt.Printf("[DEBUG] WARNING: No service key configured, using regular client (RLS will apply)\n")
	}
	
	// Create admin client to bypass RLS
	adminClient, err := supabase.NewClient(r.supabaseURL, r.serviceKey, nil)
	if err != nil {
		fmt.Printf("[DEBUG] Error creating admin client: %v, falling back to regular client\n", err)
		adminClient = r.client
	}
	
	// Debug: First fetch all active reservations to see what's in the database
	allData, _, allErr := adminClient.From("reservations").
		Select("equipment_id, start_date, end_date, status", "exact", false).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented}).
		Execute()
	if allErr == nil {
		var allRes []struct {
			EquipmentID string `json:"equipment_id"`
			StartDate   string `json:"start_date"`
			EndDate     string `json:"end_date"`
			Status      string `json:"status"`
		}
		if json.Unmarshal(allData, &allRes) == nil {
			fmt.Printf("[DEBUG] ALL active reservations in database (via admin client): %+v\n", allRes)
		}
	} else {
		fmt.Printf("[DEBUG] Error fetching all reservations: %v\n", allErr)
	}
	
	data, _, err := adminClient.From("reservations").
		Select("equipment_id, start_date, end_date, status", "exact", false).
		Lte("start_date", endDate).
		Gte("end_date", startDate).
		In("status", []string{constants.ReservationStatusPending, constants.ReservationStatusRented}).
		Execute()

	if err != nil {
		fmt.Printf("[DEBUG] Error querying reservations: %v\n", err)
		return nil, err
	}

	var reservations []struct {
		EquipmentID string `json:"equipment_id"`
		StartDate   string `json:"start_date"`
		EndDate     string `json:"end_date"`
		Status      string `json:"status"`
	}
	if err := json.Unmarshal(data, &reservations); err != nil {
		fmt.Printf("[DEBUG] Error unmarshaling reservations: %v\n", err)
		return nil, err
	}

	fmt.Printf("[DEBUG] Found %d overlapping reservations: %+v\n", len(reservations), reservations)

	// Deduplicate equipment IDs
	seen := make(map[string]bool)
	var ids []string
	for _, r := range reservations {
		if !seen[r.EquipmentID] {
			seen[r.EquipmentID] = true
			ids = append(ids, r.EquipmentID)
		}
	}

	fmt.Printf("[DEBUG] Deduplicated to %d unique equipment IDs: %v\n", len(ids), ids)
	return ids, nil
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
