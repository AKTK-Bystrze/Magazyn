package equipment

import (
	"context"

	"magazyn/backend/internal/types"
)

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
