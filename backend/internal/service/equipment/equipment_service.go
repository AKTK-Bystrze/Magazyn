package equipment

import (
	"context"
	"fmt"
	"strings"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

// EquipmentService provides operations for equipment management.
type EquipmentService struct {
	repo     repository.EquipmentRepository
	typeRepo repository.EquipmentTypeRepository
	userRepo repository.UserRepository
	baseURL  string
}

func NewEquipmentService(repo repository.EquipmentRepository, typeRepo repository.EquipmentTypeRepository, userRepo repository.UserRepository, baseURL string) *EquipmentService {
	return &EquipmentService{
		repo:     repo,
		typeRepo: typeRepo,
		userRepo: userRepo,
		baseURL:  baseURL,
	}
}

func (s *EquipmentService) List(ctx context.Context, userID string, query types.EquipmentListQuery) (*types.EquipmentListResponse, error) {
	logger.Infof(ctx, "Listing equipment - Page: %d, PerPage: %d, TypeID: %v, Status: %v", query.Page, query.PerPage, query.TypeID, query.Status)
	equipmentList, totalItems, err := s.repo.List(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch equipment: %v", err)
		return nil, types.NewInternalError("Failed to fetch equipment", err)
	}
	favoriteIDs, err := s.repo.GetUserFavorites(ctx, userID)
	if err != nil {
		logger.Warnf(ctx, "Failed to fetch user favorites: %v", err)
		favoriteIDs = make(map[string]bool)
	}
	typeIDs := make([]string, len(equipmentList))
	for i, eq := range equipmentList {
		typeIDs[i] = eq.TypeID
	}
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
	return &types.EquipmentListResponse{
		Equipment: dtos,
		Pagination: types.Pagination{
			Page:       query.Page,
			PerPage:    query.PerPage,
			TotalItems: int(totalItems),
			TotalPages: validation.CalculateTotalPages(totalItems, query.PerPage),
		},
	}, nil
}

func (s *EquipmentService) mapToEquipmentDTO(eq types.PublicEquipmentSelect, typeName string, cost int32, isFav *bool) types.EquipmentDTO {
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

func (s *EquipmentService) GetByID(ctx context.Context, id string) (*types.EquipmentDetailDTO, error) {
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
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch maintenance logs for equipment %s: %v", id, err)
	} else {
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

func (s *EquipmentService) generateImageURL(imagePath *string) *string {
	if imagePath == nil || *imagePath == "" {
		return nil
	}
	projectURL := s.baseURL
	projectURL = strings.TrimSuffix(projectURL, "/rest/v1")
	projectURL = strings.TrimSuffix(projectURL, "/")
	url := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", projectURL, constants.StorageBucket, *imagePath)
	return &url
}

func (s *EquipmentService) CheckAvailability(ctx context.Context, id string, query types.AvailabilityQuery) (*types.AvailabilityResponse, error) {
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

func (s *EquipmentService) ListEquipmentTypes(ctx context.Context) (*types.EquipmentTypeListResponse, error) {
	typesList, err := s.typeRepo.ListAll(ctx)
	if err != nil {
		logger.Errorf(ctx, "Failed to fetch equipment types: %v", err)
		return nil, types.NewInternalError("Failed to fetch equipment types", err)
	}
	return &types.EquipmentTypeListResponse{
		EquipmentTypes: typesList,
	}, nil
}

func (s *EquipmentService) CreateMaintenanceLog(ctx context.Context, equipmentID string, notes *string, userID string) (*types.MaintenanceLogDTO, error) {
	eq, err := s.repo.GetByID(ctx, equipmentID)
	if err != nil {
		return nil, types.NewNotFoundError("Equipment", equipmentID)
	}
	log, err := s.repo.CreateMaintenanceLog(ctx, equipmentID, eq.Status, eq.Status, notes, userID)
	if err != nil {
		logger.Errorf(ctx, "Failed to create maintenance log: %v", err)
		return nil, types.NewInternalError("Failed to create maintenance log", err)
	}
	authorUsername := ""
	if user, err := s.userRepo.GetByID(ctx, userID); err == nil && user != nil {
		authorUsername = user.Username
	}
	return &types.MaintenanceLogDTO{
		ID:             log.ID,
		PreviousStatus: log.PreviousStatus,
		NewStatus:      log.NewStatus,
		Notes:          log.Notes,
		AdminUsername:  authorUsername,
		CreatedAt:      log.CreatedAt,
	}, nil
}
