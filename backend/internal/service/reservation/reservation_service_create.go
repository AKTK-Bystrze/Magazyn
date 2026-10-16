package reservation

import (
	"context"
	"fmt"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

func (s *reservationService) Create(ctx context.Context, cmd types.CreateReservationsCommand, userID string, role string) (*types.CreateReservationsResponse, error) {
	logger.Infof(ctx, "Creating reservation for %d items, UserID: %s", len(cmd.Reservations), userID)
	targetUserID := userID
	if cmd.UserID != nil && *cmd.UserID != "" {
		targetUserID = *cmd.UserID
	}
	isFreeReservation := cmd.FreeReservation != nil && *cmd.FreeReservation
	if isFreeReservation && role != auth.RoleAdmin && role != auth.RoleSuperAdmin {
		return nil, types.NewForbiddenError("Only admins can create free reservations")
	}
	totalCost := int32(0)
	costs := make([]int32, len(cmd.Reservations))
	for i, req := range cmd.Reservations {
		eq, err := s.equipmentRepo.GetByID(ctx, req.EquipmentID)
		if err != nil {
			return nil, types.NewValidationError(fmt.Sprintf("Equipment %s not found", req.EquipmentID), nil)
		}
		if eq.IsArchived || eq.Status == constants.EquipmentStatusBroken {
			return nil, types.NewValidationError(fmt.Sprintf("Equipment %s is not available", safeString(eq.Name)), nil)
		}
		if !isFreeReservation {
			eqType, err := s.equipmentRepo.GetTypeByID(ctx, eq.TypeID)
			if err != nil {
				return nil, types.NewInternalError("failed to fetch equipment type", err)
			}
			cost := validation.CalculateReservationCost(req.StartDate, req.EndDate, eqType.CreditCostPerDay, false)
			totalCost += cost
			costs[i] = cost
			logger.Infof(ctx, "Reservation Item: EqID=%s, TypeID=%s, CostPerDay=%d, ItemCost=%d",
				req.EquipmentID, eq.TypeID, eqType.CreditCostPerDay, cost)
		}
	}
	if isFreeReservation {
		logger.Infof(ctx, "Creating free reservation for user %s", targetUserID)
	}
	reservationIDs, newBalance, err := s.repo.CreateReservationsAtomic(ctx, targetUserID, totalCost, isFreeReservation, userID, cmd.Reservations)
	if err != nil {
		return nil, types.NewConflictError("Reservation failed: "+err.Error(), nil)
	}
	count := min(len(cmd.Reservations), len(reservationIDs))
	succeeded := make([]types.ReservationListItem, count)
	for i := 0; i < count; i++ {
		succeeded[i] = types.ReservationListItem{
			ID:          reservationIDs[i],
			UserID:      targetUserID,
			EquipmentID: cmd.Reservations[i].EquipmentID,
			StartDate:   cmd.Reservations[i].StartDate,
			EndDate:     cmd.Reservations[i].EndDate,
			Status:      constants.ReservationStatusPending,
			CreditCost:  costs[i],
		}
	}
	go s.sendReservationConfirmationAsync(ctx, targetUserID, succeeded, totalCost, newBalance)
	return &types.CreateReservationsResponse{
		Reservations:     succeeded,
		TotalCreditCost:  totalCost,
		RemainingBalance: newBalance,
	}, nil
}

func (s *reservationService) sendReservationConfirmationAsync(ctx context.Context, targetUserID string, succeeded []types.ReservationListItem, totalCost int32, newBalance int32) {
	bgCtx := context.WithoutCancel(ctx)
	profile, _ := s.userRepo.GetByID(bgCtx, targetUserID)
	emailAddr := ""
	if profile != nil {
		emailAddr = profile.Email
	}
	details := map[string]interface{}{
		"user_id": targetUserID,
		"count":   len(succeeded),
		"cost":    totalCost,
		"balance": newBalance,
	}
	_ = s.emailService.SendReservationConfirmation(bgCtx, emailAddr, details)
}
