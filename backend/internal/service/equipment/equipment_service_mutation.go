package equipment

import (
	"context"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
)

func (s *EquipmentService) Create(ctx context.Context, cmd types.CreateEquipmentCommand, adminID string) (*types.EquipmentDTO, error) {
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

func (s *EquipmentService) Update(ctx context.Context, id string, cmd types.UpdateEquipmentCommand, adminID string) (*types.EquipmentDTO, error) {
	oldEq, err := s.repo.GetByID(ctx, id)
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
	if cmd.Status != nil && *cmd.Status != oldEq.Status {
		_, logErr := s.repo.CreateMaintenanceLog(ctx, id, oldEq.Status, *cmd.Status, nil, adminID)
		if logErr != nil {
			logger.Errorf(ctx, "Failed to create status change log: %v", logErr)
		}
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

func (s *EquipmentService) Archive(ctx context.Context, id string) error {
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
