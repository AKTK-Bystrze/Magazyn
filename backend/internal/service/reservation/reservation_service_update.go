package reservation

import (
	"context"
	"fmt"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
)

func (s *reservationService) Update(ctx context.Context, id string, cmd types.UpdateReservationCommand, userID string, role string) (*types.UpdateReservationResponse, error) {
	status := "unknown"
	if cmd.Status != nil {
		status = *cmd.Status
	}
	logger.Infof(ctx, "Updating reservation %s to status %s", id, status)
	current, err := s.repo.GetReservationByID(ctx, id)
	if err != nil {
		return nil, err
	}
	if err := s.validateUpdatePermissions(current, cmd, userID, role); err != nil {
		return nil, err
	}
	updateData := types.PublicReservationsUpdate{}
	needsUpdate := false
	var creditAdjustment int32
	var newBalance int32
	var latestUpdatedAt *string
	isCancelling := cmd.Status != nil && *cmd.Status == constants.ReservationStatusCancelled
	datesChanging := (cmd.StartDate != nil && *cmd.StartDate != current.StartDate) || (cmd.EndDate != nil && *cmd.EndDate != current.EndDate)
	if datesChanging {
		start := current.StartDate
		if cmd.StartDate != nil {
			start = *cmd.StartDate
		}
		end := current.EndDate
		if cmd.EndDate != nil {
			end = *cmd.EndDate
		}
		conflicts, err := s.repo.GetOverlappingReservations(ctx, current.EquipmentID, start, end, &id)
		if err != nil {
			return nil, err
		}
		if len(conflicts) > 0 {
			return nil, types.NewConflictError("Dates not available", nil)
		}
		if !isCancelling {
			result, err := s.repo.ModifyReservationDatesWithCredits(ctx, id, userID, start, end)
			if err != nil {
				logger.Errorf(ctx, "Failed to modify dates with credits: %v", err)
				return nil, err
			}
			creditAdjustment = result.CreditAdjustment
			newBalance = result.NewBalance
			latestUpdatedAt = &result.UpdatedAt
			if result.CreditAdjustment != 0 {
				if result.CreditAdjustment > 0 {
					logger.Infof(ctx, "Refunded %d credits for shortening reservation %s", result.CreditAdjustment, id)
				} else {
					logger.Infof(ctx, "Charged %d credits for extending reservation %s", -result.CreditAdjustment, id)
				}
			}
			current.StartDate = start
			current.EndDate = end
		} else {
			updateData.StartDate = &start
			updateData.EndDate = &end
			needsUpdate = true
		}
	}
	if cmd.Status != nil && *cmd.Status != current.Status {
		updateData.Status = cmd.Status
		needsUpdate = true
		if isCancelling {
			refundAdj, refundBal, err := s.handleCancellationRefund(ctx, current, id)
			if err != nil {
				return nil, err
			}
			if refundAdj > 0 {
				creditAdjustment = refundAdj
				newBalance = refundBal
			}
		}
	}
	if !needsUpdate && !datesChanging {
		return nil, nil
	}
	var updated *types.PublicReservationsSelect
	if needsUpdate {
		var err error
		updated, err = s.repo.UpdateReservation(ctx, id, updateData, userID)
		if err != nil {
			return nil, err
		}
	} else {
		updated = &types.PublicReservationsSelect{
			ID:          id,
			EquipmentID: current.EquipmentID,
			StartDate:   current.StartDate,
			EndDate:     current.EndDate,
			Status:      current.Status,
			UpdatedAt:   latestUpdatedAt,
		}
	}
	creditCost := s.recalculateCreditCost(ctx, updated.EquipmentID, updated.StartDate, updated.EndDate)
	return &types.UpdateReservationResponse{
		ID:               updated.ID,
		EquipmentID:      updated.EquipmentID,
		StartDate:        updated.StartDate,
		EndDate:          updated.EndDate,
		Status:           updated.Status,
		CreditCost:       creditCost,
		CreditAdjustment: creditAdjustment,
		RemainingBalance: newBalance,
		UpdatedAt:        safeString(updated.UpdatedAt),
	}, nil
}

func (s *reservationService) validateUpdatePermissions(current *types.ReservationDetail, cmd types.UpdateReservationCommand, userID string, role string) error {
	isAdmin := role == auth.RoleAdmin || role == auth.RoleSuperAdmin
	isOwner := current.UserID == userID
	if !isAdmin && !isOwner {
		return types.NewForbiddenError("Not allowed")
	}
	if !isAdmin {
		if current.Status != constants.ReservationStatusPending {
			return types.NewForbiddenError("Cannot modify non-pending reservation")
		}
	}
	if cmd.Status != nil && *cmd.Status != current.Status {
		if !isAdmin && *cmd.Status != constants.ReservationStatusCancelled && *cmd.Status != constants.ReservationStatusReturned {
			return types.NewValidationError("Users can only cancel or return pending reservations", nil)
		}
	}
	return nil
}

func (s *reservationService) handleCancellationRefund(ctx context.Context, current *types.ReservationDetail, id string) (int32, int32, error) {
	if current.IsFree {
		logger.Infof(ctx, "Skipping refund for free reservation %s", id)
		return 0, 0, nil
	}
	eq, errEq := s.equipmentRepo.GetByID(ctx, current.EquipmentID)
	if errEq != nil {
		logger.Errorf(ctx, "Refund failed: equipment %s not found: %v", current.EquipmentID, errEq)
		return 0, 0, fmt.Errorf("refund failed: equipment %s not found: %w", current.EquipmentID, errEq)
	}
	eqType, errType := s.equipmentRepo.GetTypeByID(ctx, eq.TypeID)
	if errType != nil {
		logger.Errorf(ctx, "Refund failed: equipment type %s not found: %v", eq.TypeID, errType)
		return 0, 0, fmt.Errorf("refund failed: equipment type %s not found: %w", eq.TypeID, errType)
	}
	refundAmount := CalculateReservationCost(current.StartDate, current.EndDate, eqType.CreditCostPerDay, current.IsFree)
	if refundAmount <= 0 {
		return 0, 0, nil
	}
	if err := s.repo.RefundCredits(ctx, id, refundAmount); err != nil {
		logger.Errorf(ctx, "Failed to refund %d credits for reservation %s: %v", refundAmount, id, err)
		return 0, 0, fmt.Errorf("failed to process refund: %w", err)
	}
	logger.Infof(ctx, "Refunded %d credits for reservation %s", refundAmount, id)
	var newBal int32
	userProfile, err := s.userRepo.GetByID(ctx, current.UserID)
	if err == nil && userProfile != nil {
		newBal = userProfile.CreditBalance
	}
	return refundAmount, newBal, nil
}

func (s *reservationService) recalculateCreditCost(ctx context.Context, equipmentID, startDate, endDate string) int32 {
	eq, _ := s.equipmentRepo.GetByID(ctx, equipmentID)
	if eq == nil {
		return 0
	}
	eqType, _ := s.equipmentRepo.GetTypeByID(ctx, eq.TypeID)
	if eqType == nil {
		return 0
	}
	return CalculateReservationCost(startDate, endDate, eqType.CreditCostPerDay, false)
}
