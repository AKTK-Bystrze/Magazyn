package equipment

import (
	"context"

	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
)

func (s *equipmentService) CreateMaintenanceLog(ctx context.Context, equipmentID string, notes *string, userID string) (*types.MaintenanceLogDTO, error) {
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
