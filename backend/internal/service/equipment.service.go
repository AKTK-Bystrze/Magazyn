package service

import (
	"context"
	"encoding/json"
	"fmt"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
	"math"
	"strings"

	"github.com/supabase-community/supabase-go"
)

// ============================================================================
// Equipment Service Interface
// ============================================================================

// EquipmentService defines operations for equipment management
type EquipmentService interface {
	// List retrieves a paginated list of equipment with optional filters
	// Returns equipment with favorites marked for the given user
	List(ctx context.Context, userID string, query types.EquipmentListQuery) (*types.EquipmentListResponse, error)

	// GetByID retrieves detailed equipment information including maintenance logs
	GetByID(ctx context.Context, id string) (*types.EquipmentDetailDTO, error)

	// Create creates new equipment with the given parameters
	// Validates that type_id exists and internal_id is unique within type
	Create(ctx context.Context, cmd types.CreateEquipmentCommand, adminID string) (*types.EquipmentDTO, error)

	// Update updates equipment fields
	// If status is changed, a maintenance log entry is automatically created by database trigger
	Update(ctx context.Context, id string, cmd types.UpdateEquipmentCommand, adminID string) (*types.EquipmentDTO, error)

	// Archive soft-deletes equipment by setting is_archived = true
	// Fails if equipment has active reservations (PENDING or RENTED status)
	Archive(ctx context.Context, id string) error

	// CheckAvailability checks if equipment is available for a given date range
	CheckAvailability(ctx context.Context, id string, query types.AvailabilityQuery) (*types.AvailabilityResponse, error)
}

// ============================================================================
// Equipment Service Implementation
// ============================================================================

// equipmentService implements EquipmentService using Supabase as the data store
type equipmentService struct {
	client  *supabase.Client
	baseURL string
}

// NewEquipmentService creates a new instance of EquipmentService
func NewEquipmentService(supabaseURL, supabaseKey string) (EquipmentService, error) {
	client, err := supabase.NewClient(supabaseURL, supabaseKey, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create supabase client: %w", err)
	}

	return &equipmentService{
		client:  client,
		baseURL: supabaseURL,
	}, nil
}

// ============================================================================
// Helper Types for Database Results
// ============================================================================

// equipmentWithType represents equipment joined with type information
type equipmentWithType struct {
	types.PublicEquipmentSelect
	TypeName         string `json:"type_name"`
	CreditCostPerDay int32  `json:"credit_cost_per_day"`
}

// ============================================================================
// Step 4: List Method Implementation
// ============================================================================

// List retrieves equipment list with favorites
func (s *equipmentService) List(ctx context.Context, userID string, query types.EquipmentListQuery) (*types.EquipmentListResponse, error) {
	logger.Infof(ctx, "Listing equipment - Page: %d, PerPage: %d, TypeID: %v, Status: %v", query.Page, query.PerPage, query.TypeID, query.Status)
	// Build base query with joins and filters
	qb := s.client.From("equipment").
		Select("*, equipment_types!inner(name, credit_cost_per_day)", "exact", false)

	// Apply filters BEFORE Execute
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
		// Or() requires column and value separately
		qb = qb.Or(fmt.Sprintf("name.ilike.%%%s%%,description.ilike.%%%s%%", searchTerm, searchTerm), "")
	}

	// Get total count for pagination (execute query without pagination first)
	countData, _, countErr := qb.Execute()
	if countErr != nil {
		logger.Errorf(ctx, "Failed to count equipment: %v", countErr)
		return nil, types.NewInternalError("Failed to count equipment", countErr)
	}

	var equipmentListCount []equipmentWithType
	if err := json.Unmarshal(countData, &equipmentListCount); err != nil {
		return nil, types.NewInternalError("Failed to parse equipment count", err)
	}
	totalItems := len(equipmentListCount)

	// Apply pagination and ordering
	offset := (query.Page - 1) * query.PerPage
	qb = qb.Range(offset, offset+query.PerPage-1, "").
		Order("name", nil) // Use nil for default ascending order

	// Execute final query
	data, _, err := qb.Execute()
	if err != nil {
		return nil, types.NewInternalError("Failed to fetch equipment", err)
	}

	var equipmentList []equipmentWithType
	if err := json.Unmarshal(data, &equipmentList); err != nil {
		return nil, types.NewInternalError("Failed to parse equipment data", err)
	}

	// Calculate favorites for this user
	favoriteIDs, err := s.getUserFavorites(ctx, userID)
	if err != nil {
		// Log error but don't fail the request
		favoriteIDs = make(map[string]bool)
	}

	// Transform to DTOs
	equipment := make([]types.EquipmentDTO, len(equipmentList))
	for i, eq := range equipmentList {
		isFav := favoriteIDs[eq.Id]
		equipment[i] = types.EquipmentDTO{
			ID:               eq.Id,
			InternalID:       eq.InternalId,
			TypeID:           eq.TypeId,
			TypeName:         eq.TypeName,
			Name:             eq.Name,
			Description:      eq.Description,
			Status:           eq.Status,
			CreditCostPerDay: eq.CreditCostPerDay,
			ImageURL:         s.generateImageURL(eq.ImagePath),
			IsFavorite:       &isFav,
			IsArchived:       eq.IsArchived,
			CreatedAt:        eq.CreatedAt,
			UpdatedAt:        eq.UpdatedAt,
		}
	}

	// Calculate pagination
	totalPages := int(math.Ceil(float64(totalItems) / float64(query.PerPage)))

	logger.Infof(ctx, "Equipment list retrieved successfully - Total: %d, Page: %d/%d", totalItems, query.Page, totalPages)

	return &types.EquipmentListResponse{
		Equipment: equipment,
		Pagination: types.PaginationResponse{
			Page:       query.Page,
			PerPage:    query.PerPage,
			TotalItems: totalItems,
			TotalPages: totalPages,
		},
	}, nil
}

// getUserFavorites calculates user's favorite equipment (top 3 per type)
func (s *equipmentService) getUserFavorites(ctx context.Context, userID string) (map[string]bool, error) {
	// Query user's rental history
	data, _, err := s.client.From("reservations").
		Select("equipment_id", "exact", false).
		Eq("user_id", userID).
		In("status", []string{"RENTED", "RETURNED"}).
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

	// Count rentals per equipment
	counts := make(map[string]int)
	for _, r := range reservations {
		counts[r.EquipmentID]++
	}

	// For simplicity, mark top 3 overall as favorites
	// TODO: Implement per-type ranking with SQL
	favorites := make(map[string]bool)
	maxCount := 0
	for _, count := range counts {
		if count > maxCount {
			maxCount = count
		}
	}

	// Mark equipment with highest counts as favorites (simplified)
	favouriteCount := 0
	for eqID, count := range counts {
		if count == maxCount && favouriteCount < 3 {
			favorites[eqID] = true
			favouriteCount++
		}
	}

	return favorites, nil
}

// ============================================================================
// Step 5: GetByID Method Implementation
// ============================================================================

// GetByID retrieves equipment details with maintenance logs
func (s *equipmentService) GetByID(ctx context.Context, id string) (*types.EquipmentDetailDTO, error) {
	logger.Infof(ctx, "Fetching equipment details for ID: %s", id)
	// Query equipment with type join
	data, _, err := s.client.From("equipment").
		Select("*, equipment_types!inner(name, credit_cost_per_day)", "exact", false).
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		if strings.Contains(err.Error(), "PGRST116") {
			logger.Warnf(ctx, "Equipment not found: %s", id)
			return nil, types.NewNotFoundError("Equipment", id)
		}
		logger.Errorf(ctx, "Failed to fetch equipment %s: %v", id, err)
		return nil, types.NewInternalError("Failed to fetch equipment", err)
	}

	var eq equipmentWithType
	if err := json.Unmarshal(data, &eq); err != nil {
		return nil, types.NewInternalError("Failed to parse equipment data", err)
	}

	// Query maintenance logs with admin username
	logsData, _, err := s.client.From("maintenance_logs").
		Select("*, admin:profiles!admin_id(username)", "exact", false).
		Eq("equipment_id", id).
		Order("created_at", nil).
		Execute()

	var logs []types.MaintenanceLogDTO
	if err == nil {
		var rawLogs []struct {
			types.PublicMaintenanceLogsSelect
			Admin struct {
				Username string `json:"username"`
			} `json:"admin"`
		}
		if err := json.Unmarshal(logsData, &rawLogs); err == nil {
			logs = make([]types.MaintenanceLogDTO, len(rawLogs))
			for i, log := range rawLogs {
				logs[i] = types.MaintenanceLogDTO{
					ID:             log.Id,
					PreviousStatus: log.PreviousStatus,
					NewStatus:      log.NewStatus,
					Notes:          log.Notes,
					AdminUsername:  log.Admin.Username,
					CreatedAt:      log.CreatedAt,
				}
			}
		}
	}

	// If logs failed, just return empty array
	if logs == nil {
		logs = make([]types.MaintenanceLogDTO, 0)
	}

	logger.Debugf(ctx, "Equipment details retrieved: %s (Type: %s, Status: %s)", eq.InternalId, eq.TypeName, eq.Status)

	return &types.EquipmentDetailDTO{
		ID:               eq.Id,
		InternalID:       eq.InternalId,
		TypeID:           eq.TypeId,
		TypeName:         eq.TypeName,
		Name:             eq.Name,
		Description:      eq.Description,
		Status:           eq.Status,
		CreditCostPerDay: eq.CreditCostPerDay,
		ImageURL:         s.generateImageURL(eq.ImagePath),
		IsArchived:       eq.IsArchived,
		CreatedAt:        eq.CreatedAt,
		UpdatedAt:        eq.UpdatedAt,
		MaintenanceLogs:  logs,
	}, nil
}

// ============================================================================
// Step 6: Create Method Implementation
// ============================================================================

// Create creates new equipment
func (s *equipmentService) Create(ctx context.Context, cmd types.CreateEquipmentCommand, adminID string) (*types.EquipmentDTO, error) {
	logger.Infof(ctx, "Creating new equipment - InternalID: %s, TypeID: %s", cmd.InternalID, cmd.TypeID)
	// Validate type_id exists
	typeData, _, err := s.client.From("equipment_types").
		Select("id, name, credit_cost_per_day", "exact", false).
		Eq("id", cmd.TypeID).
		Single().
		Execute()

	if err != nil {
		if strings.Contains(err.Error(), "PGRST116") {
			logger.Warnf(ctx, "Equipment type not found: %s", cmd.TypeID)
			return nil, types.NewNotFoundError("Equipment type", cmd.TypeID)
		}
		logger.Errorf(ctx, "Failed to validate equipment type %s: %v", cmd.TypeID, err)
		return nil, types.NewInternalError("Failed to validate equipment type", err)
	}

	var equipType types.PublicEquipmentTypesSelect
	if err := json.Unmarshal(typeData, &equipType); err != nil {
		return nil, types.NewInternalError("Failed to parse equipment type", err)
	}

	// Check internal_id uniqueness within type
	existingData, _, _ := s.client.From("equipment").
		Select("id", "exact", false).
		Eq("type_id", cmd.TypeID).
		Eq("internal_id", cmd.InternalID).
		Single().
		Execute()

	var existing struct{ ID string }
	if existingData != nil && json.Unmarshal(existingData, &existing) == nil {
		logger.Warnf(ctx, "Duplicate internal ID: %s for type %s", cmd.InternalID, cmd.TypeID)
		return nil, types.NewConflictError(
			"Internal ID already exists for this equipment type",
			map[string]string{
				"internal_id": cmd.InternalID,
				"type_id":     cmd.TypeID,
			},
		)
	}

	// Prepare insert data with defaults
	status := "ok"
	if cmd.Status != nil {
		status = *cmd.Status
	}

	insertData := types.PublicEquipmentInsert{
		InternalId:  cmd.InternalID,
		TypeId:      cmd.TypeID,
		Name:        cmd.Name,
		Description: cmd.Description,
		Status:      &status,
		ImagePath:   cmd.ImagePath,
	}

	// Insert equipment
	insertedData, _, err := s.client.From("equipment").
		Insert(insertData, false, "", "representation", "").
		Single().
		Execute()

	if err != nil {
		logger.Errorf(ctx, "Failed to create equipment: %v", err)
		return nil, types.NewInternalError("Failed to create equipment", err)
	}

	var created types.PublicEquipmentSelect
	if err := json.Unmarshal(insertedData, &created); err != nil {
		return nil, types.NewInternalError("Failed to parse created equipment", err)
	}

	// Return DTO with type information
	logger.Infof(ctx, "Equipment created successfully - ID: %s, InternalID: %s", created.Id, created.InternalId)

	return &types.EquipmentDTO{
		ID:               created.Id,
		InternalID:       created.InternalId,
		TypeID:           created.TypeId,
		TypeName:         equipType.Name,
		Name:             created.Name,
		Description:      created.Description,
		Status:           created.Status,
		CreditCostPerDay: equipType.CreditCostPerDay,
		ImageURL:         s.generateImageURL(created.ImagePath),
		IsArchived:       created.IsArchived,
		CreatedAt:        created.CreatedAt,
		UpdatedAt:        created.UpdatedAt,
	}, nil
}

// ============================================================================
// Step 7: Update Method Implementation
// ============================================================================

// Update updates equipment fields
func (s *equipmentService) Update(ctx context.Context, id string, cmd types.UpdateEquipmentCommand, adminID string) (*types.EquipmentDTO, error) {
	logger.Infof(ctx, "Updating equipment: %s", id)
	// Verify at least one field is provided
	if cmd.Name == nil && cmd.Description == nil && cmd.Status == nil && cmd.ImagePath == nil {
		return nil, types.NewValidationError(
			"At least one field must be provided",
			map[string]string{"fields": "name, description, status, or image_path"},
		)
	}

	// Verify equipment exists
	_, _, err := s.client.From("equipment").
		Select("id, status", "exact", false).
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		if strings.Contains(err.Error(), "PGRST116") {
			logger.Warnf(ctx, "Equipment not found for update: %s", id)
			return nil, types.NewNotFoundError("Equipment", id)
		}
		logger.Errorf(ctx, "Failed to fetch equipment %s for update: %v", id, err)
		return nil, types.NewInternalError("Failed to fetch equipment", err)
	}

	// Build update payload with only provided fields
	updateData := types.PublicEquipmentUpdate{}
	hasUpdate := false

	if cmd.Name != nil {
		updateData.Name = cmd.Name
		hasUpdate = true
	}
	if cmd.Description != nil {
		updateData.Description = cmd.Description
		hasUpdate = true
	}
	if cmd.Status != nil {
		updateData.Status = cmd.Status
		hasUpdate = true
		// Note: Database trigger will automatically create maintenance_logs entry
	}
	if cmd.ImagePath != nil {
		updateData.ImagePath = cmd.ImagePath
		hasUpdate = true
	}

	if !hasUpdate {
		return nil, types.NewValidationError("No valid fields provided for update", nil)
	}

	// Execute update
	_, _, err = s.client.From("equipment").
		Update(updateData, "", "representation").
		Eq("id", id).
		Execute()

	if err != nil {
		logger.Errorf(ctx, "Failed to update equipment %s: %v", id, err)
		return nil, types.NewInternalError("Failed to update equipment", err)
	}

	// Retrieve updated equipment with type information
	updatedData, _, err := s.client.From("equipment").
		Select("*, equipment_types!inner(name, credit_cost_per_day)", "exact", false).
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		return nil, types.NewInternalError("Failed to fetch updated equipment", err)
	}

	var updated equipmentWithType
	if err := json.Unmarshal(updatedData, &updated); err != nil {
		return nil, types.NewInternalError("Failed to parse updated equipment", err)
	}

	// Return DTO with type information
	logger.Infof(ctx, "Equipment updated successfully: %s", id)

	return &types.EquipmentDTO{
		ID:               updated.Id,
		InternalID:       updated.InternalId,
		TypeID:           updated.TypeId,
		TypeName:         updated.TypeName,
		Name:             updated.Name,
		Description:      updated.Description,
		Status:           updated.Status,
		CreditCostPerDay: updated.CreditCostPerDay,
		ImageURL:         s.generateImageURL(updated.ImagePath),
		IsArchived:       updated.IsArchived,
		CreatedAt:        updated.CreatedAt,
		UpdatedAt:        updated.UpdatedAt,
	}, nil
}

// ============================================================================
// Step 8: Archive Method Implementation
// ============================================================================

// Archive soft-deletes equipment by setting is_archived = true
func (s *equipmentService) Archive(ctx context.Context, id string) error {
	logger.Infof(ctx, "Archiving equipment: %s", id)
	// Verify equipment exists
	existsData, _, err := s.client.From("equipment").
		Select("id, is_archived", "exact", false).
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		if strings.Contains(err.Error(), "PGRST116") {
			logger.Warnf(ctx, "Equipment not found for archiving: %s", id)
			return types.NewNotFoundError("Equipment", id)
		}
		logger.Errorf(ctx, "Failed to fetch equipment %s for archiving: %v", id, err)
		return types.NewInternalError("Failed to fetch equipment", err)
	}

	var equipment struct {
		ID         string `json:"id"`
		IsArchived bool   `json:"is_archived"`
	}
	if err := json.Unmarshal(existsData, &equipment); err != nil {
		return types.NewInternalError("Failed to parse equipment", err)
	}

	// Check if already archived
	if equipment.IsArchived {
		logger.Warnf(ctx, "Equipment already archived: %s", id)
		return types.NewValidationError("Equipment is already archived", map[string]string{"id": id})
	}

	// Check for active reservations (PENDING or RENTED)
	activeData, _, err := s.client.From("reservations").
		Select("id, status", "exact", false).
		Eq("equipment_id", id).
		In("status", []string{"PENDING", "RENTED"}).
		Execute()

	if err != nil {
		return types.NewInternalError("Failed to check active reservations", err)
	}

	var activeReservations []struct {
		ID     string `json:"id"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(activeData, &activeReservations); err == nil && len(activeReservations) > 0 {
		// Extract reservation IDs for error details
		reservationIDs := make([]string, len(activeReservations))
		for i, r := range activeReservations {
			reservationIDs[i] = r.ID
		}

		logger.Warnf(ctx, "Cannot archive equipment %s - has %d active reservations", id, len(activeReservations))
		return types.NewConflictError(
			"Cannot archive equipment with active reservations",
			map[string]interface{}{
				"active_count":    len(activeReservations),
				"reservation_ids": reservationIDs,
			},
		)
	}

	// Set is_archived = true
	archived := true
	updateData := types.PublicEquipmentUpdate{
		IsArchived: &archived,
	}

	_, _, err = s.client.From("equipment").
		Update(updateData, "", "").
		Eq("id", id).
		Execute()

	if err != nil {
		logger.Errorf(ctx, "Failed to archive equipment %s: %v", id, err)
		return types.NewInternalError("Failed to archive equipment", err)
	}

	logger.Infof(ctx, "Equipment archived successfully: %s", id)
	return nil
}

// ============================================================================
// Step 9: CheckAvailability Method Implementation
// ============================================================================

// CheckAvailability checks equipment availability for date range
func (s *equipmentService) CheckAvailability(ctx context.Context, id string, query types.AvailabilityQuery) (*types.AvailabilityResponse, error) {
	logger.Infof(ctx, "Checking availability for equipment %s from %s to %s", id, query.StartDate, query.EndDate)
	// Verify equipment exists
	_, _, err := s.client.From("equipment").
		Select("id", "exact", false).
		Eq("id", id).
		Single().
		Execute()

	if err != nil {
		if strings.Contains(err.Error(), "PGRST116") {
			logger.Warnf(ctx, "Equipment not found for availability check: %s", id)
			return nil, types.NewNotFoundError("Equipment", id)
		}
		logger.Errorf(ctx, "Failed to fetch equipment %s for availability check: %v", id, err)
		return nil, types.NewInternalError("Failed to fetch equipment", err)
	}

	// Query reservations that overlap with requested date range
	// Overlap condition: (reservation.start_date <= query.end_date) AND (reservation.end_date >= query.start_date)
	conflictsData, _, err := s.client.From("reservations").
		Select("id, start_date, end_date, status", "exact", false).
		Eq("equipment_id", id).
		Lte("start_date", query.EndDate).            // start_date <= query.end_date
		Gte("end_date", query.StartDate).            // end_date >= query.start_date
		In("status", []string{"PENDING", "RENTED"}). // Only active reservations
		Execute()

	if err != nil {
		return nil, types.NewInternalError("Failed to check availability", err)
	}

	var reservations []struct {
		ID        string `json:"id"`
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		Status    string `json:"status"`
	}

	// Parse conflicts (empty array if no conflicts)
	if err := json.Unmarshal(conflictsData, &reservations); err != nil {
		// If unmarshal fails, assume no conflicts
		reservations = make([]struct {
			ID        string `json:"id"`
			StartDate string `json:"start_date"`
			EndDate   string `json:"end_date"`
			Status    string `json:"status"`
		}, 0)
	}

	// Transform to ConflictingReservation DTOs
	conflicts := make([]types.ConflictingReservation, len(reservations))
	for i, r := range reservations {
		conflicts[i] = types.ConflictingReservation{
			ID:        r.ID,
			StartDate: r.StartDate,
			EndDate:   r.EndDate,
			Status:    r.Status,
		}
	}

	isAvailable := len(conflicts) == 0
	if isAvailable {
		logger.Infof(ctx, "Equipment %s is available for requested period", id)
	} else {
		logger.Warnf(ctx, "Equipment %s has %d conflicting reservations", id, len(conflicts))
	}

	return &types.AvailabilityResponse{
		EquipmentID:             id,
		IsAvailable:             isAvailable,
		ConflictingReservations: conflicts,
	}, nil
}

// ============================================================================
// Helper Methods
// ============================================================================

// generateImageURL converts image path to public URL
func (s *equipmentService) generateImageURL(imagePath *string) *string {
	if imagePath == nil || *imagePath == "" {
		return nil
	}

	// Generate public URL
	// We expect s.baseURL to be the project root URL. 
	// If it contains /rest/v1 (PostgREST specific), we trim it to get the root.
	projectURL := s.baseURL
	if strings.HasSuffix(projectURL, "/rest/v1") {
		projectURL = strings.TrimSuffix(projectURL, "/rest/v1")
	}
	projectURL = strings.TrimSuffix(projectURL, "/")

	url := fmt.Sprintf("%s/storage/v1/object/public/equipment/%s", projectURL, *imagePath)
	return &url
}
