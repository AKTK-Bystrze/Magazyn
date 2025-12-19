package equipment

import (
	"context"
	"fmt"
	"math"
	"strings"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

// ============================================================================
// Equipment Service Interface
// ============================================================================

// EquipmentService defines operations for equipment management
type EquipmentService interface {
	// List retrieves a paginated list of equipment with optional filters
	List(ctx context.Context, userID string, query types.EquipmentListQuery) (*types.EquipmentListResponse, error)

	// GetByID retrieves detailed equipment information including maintenance logs
	GetByID(ctx context.Context, id string) (*types.EquipmentDetailDTO, error)

	// Create creates new equipment with the given parameters
	Create(ctx context.Context, cmd types.CreateEquipmentCommand, adminID string) (*types.EquipmentDTO, error)

	// Update updates equipment fields
	Update(ctx context.Context, id string, cmd types.UpdateEquipmentCommand, adminID string) (*types.EquipmentDTO, error)

	// Archive soft-deletes equipment by setting is_archived = true
	Archive(ctx context.Context, id string) error

	// CheckAvailability checks if equipment is available for a given date range
	CheckAvailability(ctx context.Context, id string, query types.AvailabilityQuery) (*types.AvailabilityResponse, error)

	// ListEquipmentTypes retrieves all equipment types
	ListEquipmentTypes(ctx context.Context) (*types.EquipmentTypeListResponse, error)

	// CreateEquipmentType creates a new equipment type
	CreateEquipmentType(ctx context.Context, cmd types.CreateEquipmentTypeRequest) (*types.PublicEquipmentTypesSelect, error)

	// CreateMaintenanceLog adds a maintenance log entry for equipment
	CreateMaintenanceLog(ctx context.Context, equipmentID string, notes *string, userID string) (*types.MaintenanceLogDTO, error)
}

// ============================================================================
// Equipment Service Implementation
// ============================================================================

type equipmentService struct {
	repo     repository.EquipmentRepository
	typeRepo repository.EquipmentTypeRepository
	baseURL  string
}

// NewEquipmentService creates a new instance of EquipmentService
func NewEquipmentService(repo repository.EquipmentRepository, typeRepo repository.EquipmentTypeRepository, baseURL string) EquipmentService {
	return &equipmentService{
		repo:     repo,
		typeRepo: typeRepo,
		baseURL:  baseURL,
	}
}

// List retrieves equipment list with favorites
func (s *equipmentService) List(ctx context.Context, userID string, query types.EquipmentListQuery) (*types.EquipmentListResponse, error) {
	logger.Infof(ctx, "Listing equipment - Page: %d, PerPage: %d, TypeID: %v, Status: %v", query.Page, query.PerPage, query.TypeID, query.Status)

	equipmentList, totalItems, err := s.repo.List(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch equipment: %v", err)
		return nil, types.NewInternalError("Failed to fetch equipment", err)
	}

	// Calculate favorites
	favoriteIDs, err := s.repo.GetUserFavorites(ctx, userID)
	if err != nil {
		// Log error but don't fail request
		logger.Warnf(ctx, "Failed to fetch user favorites: %v", err)
		favoriteIDs = make(map[string]bool)
	}

	// Collect Type IDs
	typeIDs := make([]string, len(equipmentList))
	for i, eq := range equipmentList {
		typeIDs[i] = eq.TypeID
	}

	// Bulk fetch types
	typesMap, err := s.typeRepo.GetTypesByIDs(ctx, typeIDs)
	if err != nil {
		logger.Warnf(ctx, "Failed to fetch types: %v", err)
		typesMap = make(map[string]types.PublicEquipmentTypesSelect)
	}

	dtos := make([]types.EquipmentDTO, len(equipmentList))
	for i, eq := range equipmentList {
		typ, ok := typesMap[eq.TypeID]
		typeName := "Unknown"
		cost := int32(0)
		if ok {
			typeName = typ.Name
			cost = typ.CreditCostPerDay
		}

		isFav := favoriteIDs[eq.ID]
		dtos[i] = s.mapToEquipmentDTO(eq, typeName, cost, &isFav)
	}

	// Calculate pagination
	totalPages := int(math.Ceil(float64(totalItems) / float64(query.PerPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	return &types.EquipmentListResponse{
		Equipment: dtos,
		Pagination: types.PaginationResponse{
			Page:       query.Page,
			PerPage:    query.PerPage,
			TotalItems: int(totalItems),
			TotalPages: totalPages,
		},
	}, nil
}

func (s *equipmentService) mapToEquipmentDTO(eq types.PublicEquipmentSelect, typeName string, cost int32, isFav *bool) types.EquipmentDTO {
	return types.EquipmentDTO{
		ID:               eq.ID,
		InternalID:       eq.InternalID,
		TypeID:           eq.TypeID,
		TypeName:         typeName,
		Name:             eq.Name,
		Description:      eq.Description,
		Status:           eq.Status,
		CreditCostPerDay: cost,
		ImageURL:         s.generateImageURL(eq.ImagePath),
		IsFavorite:       isFav,
		IsArchived:       eq.IsArchived,
		CreatedAt:        eq.CreatedAt,
		UpdatedAt:        eq.UpdatedAt,
	}
}

func (s *equipmentService) GetByID(ctx context.Context, id string) (*types.EquipmentDetailDTO, error) {
	logger.Infof(ctx, "Fetching equipment details for ID: %s", id)

	eq, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, types.NewNotFoundError("Equipment", id)
	}

	typ, _ := s.repo.GetTypeByID(ctx, eq.TypeID)
	typeName := ""
	cost := int32(0)
	if typ != nil {
		typeName = typ.Name
		cost = typ.CreditCostPerDay
	}

	logs, err := s.repo.GetMaintenanceLogsWithAdmin(ctx, id)
	logDTOs := make([]types.MaintenanceLogDTO, 0)
	if err == nil {
		for _, l := range logs {
			logDTOs = append(logDTOs, types.MaintenanceLogDTO{
				ID:             l.ID,
				PreviousStatus: l.PreviousStatus,
				NewStatus:      l.NewStatus,
				Notes:          l.Notes,
				AdminUsername:  l.AdminUsername,
				CreatedAt:      l.CreatedAt,
			})
		}
	}

	return &types.EquipmentDetailDTO{
		ID:               eq.ID,
		InternalID:       eq.InternalID,
		TypeID:           eq.TypeID,
		TypeName:         typeName,
		Name:             eq.Name,
		Description:      eq.Description,
		Status:           eq.Status,
		CreditCostPerDay: cost,
		ImageURL:         s.generateImageURL(eq.ImagePath),
		IsArchived:       eq.IsArchived,
		CreatedAt:        eq.CreatedAt,
		UpdatedAt:        eq.UpdatedAt,
		MaintenanceLogs:  logDTOs,
	}, nil
}

func (s *equipmentService) Create(ctx context.Context, cmd types.CreateEquipmentCommand, adminID string) (*types.EquipmentDTO, error) {
	typ, err := s.repo.GetTypeByID(ctx, cmd.TypeID)
	if err != nil {
		return nil, types.NewNotFoundError("Equipment Type", cmd.TypeID)
	}

	exists, _ := s.repo.GetInternalIDCheck(ctx, cmd.TypeID, cmd.InternalID)
	if exists {
		return nil, types.NewConflictError("Internal ID exists", nil)
	}

	status := constants.EquipmentStatusOK
	if cmd.Status != nil {
		status = *cmd.Status
	}

	insert := types.PublicEquipmentInsert{
		InternalID:  cmd.InternalID,
		TypeID:      cmd.TypeID,
		Name:        cmd.Name,
		Description: cmd.Description,
		Status:      &status,
		ImagePath:   cmd.ImagePath,
	}

	logger.Infof(ctx, "Creating equipment with: InternalID=%s, TypeID=%s, Status=%s", cmd.InternalID, cmd.TypeID, status)

	created, err := s.repo.Create(ctx, insert)
	if err != nil {
		logger.Errorf(ctx, "Repository Create failed: %v", err)
		return nil, err
	}

	return &types.EquipmentDTO{
		ID:               created.ID,
		InternalID:       created.InternalID,
		TypeID:           created.TypeID,
		TypeName:         typ.Name,
		Name:             created.Name,
		Description:      created.Description,
		Status:           created.Status,
		CreditCostPerDay: typ.CreditCostPerDay,
		ImageURL:         s.generateImageURL(created.ImagePath),
		IsArchived:       created.IsArchived,
		CreatedAt:        created.CreatedAt,
		UpdatedAt:        created.UpdatedAt,
	}, nil
}

func (s *equipmentService) Update(ctx context.Context, id string, cmd types.UpdateEquipmentCommand, adminID string) (*types.EquipmentDTO, error) {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, types.NewNotFoundError("Equipment", id)
	}

	update := types.PublicEquipmentUpdate{
		Name:        cmd.Name,
		Description: cmd.Description,
		Status:      cmd.Status,
		ImagePath:   cmd.ImagePath,
	}

	updated, err := s.repo.Update(ctx, id, update)
	if err != nil {
		logger.Errorf(ctx, "Repository Update failed: %v", err)
		return nil, err
	}

	typ, _ := s.repo.GetTypeByID(ctx, updated.TypeID)
	typeName := ""
	cost := int32(0)
	if typ != nil {
		typeName = typ.Name
		cost = typ.CreditCostPerDay
	}

	return &types.EquipmentDTO{
		ID:               updated.ID,
		InternalID:       updated.InternalID,
		TypeID:           updated.TypeID,
		TypeName:         typeName,
		Name:             updated.Name,
		Description:      updated.Description,
		Status:           updated.Status,
		CreditCostPerDay: cost,
		ImageURL:         s.generateImageURL(updated.ImagePath),
		IsArchived:       updated.IsArchived,
		CreatedAt:        updated.CreatedAt,
		UpdatedAt:        updated.UpdatedAt,
	}, nil
}

func (s *equipmentService) Archive(ctx context.Context, id string) error {
	exists, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return types.NewNotFoundError("Equipment", id)
	}
	if exists.IsArchived {
		return types.NewValidationError("Already archived", nil)
	}

	active, err := s.repo.GetActiveReservations(ctx, id)
	if err == nil && len(active) > 0 {
		return types.NewConflictError("Has active reservations", nil)
	}

	return s.repo.Archive(ctx, id)
}

func (s *equipmentService) CheckAvailability(ctx context.Context, id string, query types.AvailabilityQuery) (*types.AvailabilityResponse, error) {
	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, types.NewNotFoundError("Equipment", id)
	}

	conflicts, err := s.repo.GetConflictingReservations(ctx, id, query.StartDate, query.EndDate)
	if err != nil {
		return nil, err
	}

	conflictDTOs := make([]types.ConflictingReservation, len(conflicts))
	for i, c := range conflicts {
		conflictDTOs[i] = types.ConflictingReservation{
			ID:        c.ID,
			StartDate: c.StartDate,
			EndDate:   c.EndDate,
			Status:    c.Status,
		}
	}

	return &types.AvailabilityResponse{
		EquipmentID:             id,
		IsAvailable:             len(conflicts) == 0,
		ConflictingReservations: conflictDTOs,
	}, nil
}

func (s *equipmentService) ListEquipmentTypes(ctx context.Context) (*types.EquipmentTypeListResponse, error) {
	typesList, err := s.typeRepo.ListAll(ctx)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch equipment types: %v", err)
		return nil, types.NewInternalError("Failed to fetch equipment types", err)
	}

	return &types.EquipmentTypeListResponse{
		EquipmentTypes: typesList,
	}, nil
}

func (s *equipmentService) generateImageURL(imagePath *string) *string {
	if imagePath == nil || *imagePath == "" {
		return nil
	}
	projectURL := s.baseURL
	projectURL = strings.TrimSuffix(projectURL, "/rest/v1")
	projectURL = strings.TrimSuffix(projectURL, "/")
	url := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", projectURL, constants.StorageBucket, *imagePath)
	return &url
}

func (s *equipmentService) CreateEquipmentType(ctx context.Context, cmd types.CreateEquipmentTypeRequest) (*types.PublicEquipmentTypesSelect, error) {
	// 1. Create Type
	t := types.PublicEquipmentTypesInsert{
		Name:             cmd.Name,
		CreditCostPerDay: cmd.CreditCostPerDay,
	}

	created, err := s.typeRepo.Create(ctx, t)
	if err != nil {
		logger.Errorf(ctx, "Failed to create equipment type: %v", err)
		return nil, types.NewInternalError("Failed to create equipment type", err)
	}

	return created, nil
}

// CreateMaintenanceLog adds a maintenance log entry for equipment
func (s *equipmentService) CreateMaintenanceLog(ctx context.Context, equipmentID string, notes *string, userID string) (*types.MaintenanceLogDTO, error) {
	eq, err := s.repo.GetByID(ctx, equipmentID)
	if err != nil {
		return nil, types.NewNotFoundError("Equipment", equipmentID)
	}

	// Create log with current status as both previous and new (note-only entry)
	log, err := s.repo.CreateMaintenanceLog(ctx, equipmentID, eq.Status, eq.Status, notes, userID)
	if err != nil {
		logger.Errorf(ctx, "Failed to create maintenance log: %v", err)
		return nil, types.NewInternalError("Failed to create maintenance log", err)
	}

	return &types.MaintenanceLogDTO{
		ID:             log.ID,
		PreviousStatus: log.PreviousStatus,
		NewStatus:      log.NewStatus,
		Notes:          log.Notes,
		AdminUsername:  "", // User who created it - could be fetched if needed
		CreatedAt:      log.CreatedAt,
	}, nil
}
