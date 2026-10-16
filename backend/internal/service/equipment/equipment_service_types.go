package equipment

import (
	"context"

	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
)

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
