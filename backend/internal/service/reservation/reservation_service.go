package reservation

// Package reservation provides the service layer logic for managing reservations.
// It handles business rules validation, credit calculation, and orchestrates operations
// between repositories.

import (
	"context"
	"fmt"
	"time"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/service/email"
	"magazyn/backend/internal/types"
)

// ============================================================================
// Reservation Service Interface
// ============================================================================

type ReservationService interface {
	// List retrieves a paginated list of reservations based on the provided query filters.
	List(ctx context.Context, query types.ReservationListQuery) (*types.ReservationListResponse, error)

	GetByID(ctx context.Context, id string, userID string, role string) (*types.ReservationDetail, error)

	Create(ctx context.Context, cmd types.CreateReservationsCommand, userID string) (*types.CreateReservationsResponse, error)

	Update(ctx context.Context, id string, cmd types.UpdateReservationCommand, userID string, role string) (*types.UpdateReservationResponse, error)

	// BulkUpdate updates multiple reservations (Admin only)
	BulkUpdate(ctx context.Context, cmd types.BulkUpdateReservationsCommand, adminID string) (*types.BulkStatusUpdateResponse, error)

	GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error)
}

// ============================================================================
// Reservation Service Implementation
// ============================================================================

type reservationService struct {
	repo          repository.ReservationRepository
	equipmentRepo repository.EquipmentRepository
	userRepo      repository.UserRepository
	emailService  email.EmailService
}

func NewReservationService(
	repo repository.ReservationRepository,
	equipmentRepo repository.EquipmentRepository,
	userRepo repository.UserRepository,
	emailService email.EmailService,
) ReservationService {
	return &reservationService{
		repo:          repo,
		equipmentRepo: equipmentRepo,
		userRepo:      userRepo,
		emailService:  emailService,
	}
}

// List retrieves a paginated list of reservations
func (s *reservationService) List(ctx context.Context, query types.ReservationListQuery) (*types.ReservationListResponse, error) {
	logger.Infof(ctx, "Listing reservations - Page: %d, PerPage: %d", query.Page, query.PerPage)

	items, total, err := s.repo.GetReservations(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "Failed to list reservations: %v", err)
		return nil, types.NewInternalError("Failed to list reservations", err)
	}

	// Calculate pagination
	totalPages := 0
	if query.PerPage > 0 {
		totalPages = int((total + int64(query.PerPage) - 1) / int64(query.PerPage))
	}

	return &types.ReservationListResponse{
		Reservations: items,
		Pagination: types.PaginationResponse{
			Page:       query.Page,
			PerPage:    query.PerPage,
			TotalItems: int(total),
			TotalPages: totalPages,
		},
	}, nil
}

// GetByID retrieves detailed reservation information
func (s *reservationService) GetByID(ctx context.Context, id string, userID string, role string) (*types.ReservationDetail, error) {
	res, err := s.repo.GetReservationByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if role != auth.RoleAdmin && role != auth.RoleSuperAdmin && res.UserID != userID {
		return nil, types.NewForbiddenError("You are not allowed to view this reservation")
	}

	return res, nil
}

// Create creates new reservations (transactional logic handled by DB RPC)
func (s *reservationService) Create(ctx context.Context, cmd types.CreateReservationsCommand, userID string) (*types.CreateReservationsResponse, error) {
	logger.Infof(ctx, "Creating reservation for %d items, UserID: %s", len(cmd.Reservations), userID)
	targetUserID := userID
	if cmd.UserID != nil && *cmd.UserID != "" {
		targetUserID = *cmd.UserID
	}
	isFreeReservation := cmd.FreeReservation != nil && *cmd.FreeReservation

	// 1. Validation & Cost Calculation (Read-Only)
	totalCost := int32(0)
	costMap := make(map[int]int32)

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

			days := s.calculateDays(req.StartDate, req.EndDate)
			cost := days * eqType.CreditCostPerDay
			totalCost += cost
			costMap[i] = cost

			logger.Infof(ctx, "Reservation Item: EqID=%s, TypeID=%s, Days=%d, CostPerDay=%d, ItemCost=%d",
				req.EquipmentID, eq.TypeID, days, eqType.CreditCostPerDay, cost)
		} else {
			costMap[i] = 0
		}
	}

	if isFreeReservation {
		logger.Infof(ctx, "Creating free reservation for user %s", targetUserID)
	}
	reservationIDs, newBalance, err := s.repo.CreateReservationsAtomic(ctx, targetUserID, totalCost, isFreeReservation, userID, cmd.Reservations)
	if err != nil {
		return nil, types.NewConflictError("Reservation failed: "+err.Error(), nil)
	}

	var succeeded []types.ReservationListItem
	for i, req := range cmd.Reservations {
		if i < len(reservationIDs) {
			succeeded = append(succeeded, types.ReservationListItem{
				ID:          reservationIDs[i],
				UserID:      targetUserID,
				EquipmentID: req.EquipmentID,
				StartDate:   req.StartDate,
				EndDate:     req.EndDate,
				Status:      constants.ReservationStatusPending,
				CreditCost:  costMap[i],
			})
		}
	}

	// Send Email (Async)
	go func() {
		// Needs a detached context or careful context handling.
		// Using Background context to ensure it runs even if request context cancels.
		// In production, use a task queue.
		bgCtx := context.Background()

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
	}()

	return &types.CreateReservationsResponse{
		Reservations:     succeeded,
		TotalCreditCost:  totalCost,
		RemainingBalance: newBalance,
	}, nil
}

// Update updates a reservation
func (s *reservationService) Update(ctx context.Context, id string, cmd types.UpdateReservationCommand, userID string, role string) (*types.UpdateReservationResponse, error) {
	status := "unknown"
	if cmd.Status != nil {
		status = string(*cmd.Status)
	}
	logger.Infof(ctx, "Updating reservation %s to status %s", id, status)
	current, err := s.repo.GetReservationByID(ctx, id)
	if err != nil {
		return nil, err
	}

	isAdmin := role == auth.RoleAdmin || role == auth.RoleSuperAdmin
	isOwner := current.UserID == userID

	if !isAdmin && !isOwner {
		return nil, types.NewForbiddenError("Not allowed")
	}

	if !isAdmin {
		if current.Status != constants.ReservationStatusPending {
			return nil, types.NewForbiddenError("Cannot modify non-pending reservation")
		}
	}
	if cmd.Status != nil && *cmd.Status != current.Status {
		if !isAdmin && *cmd.Status != constants.ReservationStatusDenied && *cmd.Status != constants.ReservationStatusReturned {
			// User tried to set something other than DENIED or RETURNED
			return nil, types.NewValidationError("Users can only cancel or return pending reservations", nil)
		}
	}

	updateData := types.PublicReservationsUpdate{}
	needsUpdate := false

	var creditAdjustment int32 = 0
	var newBalance int32 = 0
	var latestUpdatedAt *string

	// Check if this is a full cancellation
	isCancelling := cmd.Status != nil && (*cmd.Status == constants.ReservationStatusDenied || *cmd.Status == constants.ReservationStatusCancelled)

	// Handle Date Change
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

		// Check availability
		conflicts, err := s.repo.GetOverlappingReservations(ctx, current.EquipmentID, start, end, &id)
		if err != nil {
			return nil, err
		}
		if len(conflicts) > 0 {
			return nil, types.NewConflictError("Dates not available", nil)
		}

		if !isCancelling {
			// Use the atomic credit adjustment function to handle partial refunds or extra charges
			result, err := s.repo.ModifyReservationDatesWithCredits(ctx, id, userID, start, end)
			if err != nil {
				logger.Errorf(ctx, "Failed to modify dates with credits: %v", err)
				return nil, err
			}

			creditAdjustment = result.CreditAdjustment
			newBalance = result.NewBalance
			latestUpdatedAt = &result.UpdatedAt

			// Log successful credit adjustment
			if result.CreditAdjustment != 0 {
				if result.CreditAdjustment > 0 {
					logger.Infof(ctx, "Refunded %d credits for shortening reservation %s", result.CreditAdjustment, id)
				} else {
					logger.Infof(ctx, "Charged %d credits for extending reservation %s", -result.CreditAdjustment, id)
				}
			}

			// Update our local 'current' variable so we know dates were already updated
			current.StartDate = start
			current.EndDate = end
		} else {
			// Just update dates in updateData without calculating partial refunds
			// because full refund will be handled below
			updateData.StartDate = &start
			updateData.EndDate = &end
			needsUpdate = true
		}
	}

	// Handle Status Change
	if cmd.Status != nil && *cmd.Status != current.Status {
		updateData.Status = cmd.Status
		needsUpdate = true

		// If cancelling (DENIED or CANCELLED), do a FULL refund
		if isCancelling {
			if current.IsFree {
				logger.Infof(ctx, "Skipping refund for free reservation %s", id)
			} else {
				eq, errEq := s.equipmentRepo.GetByID(ctx, current.EquipmentID)
				if errEq != nil {
					logger.Errorf(ctx, "Refund failed: equipment %s not found: %v", current.EquipmentID, errEq)
					return nil, fmt.Errorf("refund failed: equipment %s not found: %w", current.EquipmentID, errEq)
				}

				eqType, errType := s.equipmentRepo.GetTypeByID(ctx, eq.TypeID)
				if errType != nil {
					logger.Errorf(ctx, "Refund failed: equipment type %s not found: %v", eq.TypeID, errType)
					return nil, fmt.Errorf("refund failed: equipment type %s not found: %w", eq.TypeID, errType)
				}

				days := s.calculateDays(current.StartDate, current.EndDate)
				refundAmount := days * eqType.CreditCostPerDay

				if refundAmount > 0 {
					if err := s.repo.RefundCredits(ctx, id, refundAmount); err != nil {
						logger.Errorf(ctx, "Failed to refund %d credits for reservation %s: %v", refundAmount, id, err)
						return nil, fmt.Errorf("failed to process refund: %w", err)
					}
					logger.Infof(ctx, "Refunded %d credits for reservation %s", refundAmount, id)
					creditAdjustment = refundAmount
					// Fetch new balance
					userProfile, err := s.userRepo.GetByID(ctx, current.UserID)
					if err == nil && userProfile != nil {
						newBalance = userProfile.CreditBalance
					}
				}
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
		// Only dates changed, and they were already updated via ModifyReservationDatesWithCredits
		updated = &types.PublicReservationsSelect{
			ID:          id,
			EquipmentID: current.EquipmentID,
			StartDate:   current.StartDate,
			EndDate:     current.EndDate,
			Status:      current.Status,
			UpdatedAt:   latestUpdatedAt,
		}
	}

	// Calculate credit cost for the response
	eq, _ := s.equipmentRepo.GetByID(ctx, updated.EquipmentID)
	var creditCost int32
	if eq != nil {
		eqType, _ := s.equipmentRepo.GetTypeByID(ctx, eq.TypeID)
		if eqType != nil {
			days := s.calculateDays(updated.StartDate, updated.EndDate)
			creditCost = days * eqType.CreditCostPerDay
		}
	}

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

func (s *reservationService) BulkUpdate(ctx context.Context, cmd types.BulkUpdateReservationsCommand, adminID string) (*types.BulkStatusUpdateResponse, error) {
	return s.repo.BulkUpdateStatusAtomic(ctx, cmd.ReservationIDs, cmd.Status, adminID)
}

func (s *reservationService) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
	return s.repo.GetDashboardStats(ctx)
}

func (s *reservationService) calculateDays(start, end string) int32 {
	layout := constants.DateFormatISO
	t1, _ := time.Parse(layout, start)
	t2, _ := time.Parse(layout, end)

	days := int32(t2.Sub(t1).Hours() / 24)
	if days < 0 {
		return 0
	}
	return days + 1
}

func safeString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
