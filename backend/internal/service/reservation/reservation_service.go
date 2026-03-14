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

// ReservationService defines operations for reservation management.
type ReservationService interface {
	// List retrieves a paginated list of reservations based on the provided query filters.
	List(ctx context.Context, query types.ReservationListQuery) (*types.ReservationListResponse, error)

	// GetByID retrieves detailed reservation information
	GetByID(ctx context.Context, id string, userID string, role string) (*types.ReservationDetail, error)

	// Create creates new reservations (transactional logic simulated)
	Create(ctx context.Context, cmd types.CreateReservationsCommand, userID string) (*types.CreateReservationsResponse, error)

	// Update updates a reservation
	Update(ctx context.Context, id string, cmd types.UpdateReservationCommand, userID string, role string) (*types.UpdateReservationResponse, error)

	// BulkUpdate updates multiple reservations (Admin only)
	BulkUpdate(ctx context.Context, cmd types.BulkUpdateReservationsCommand, adminID string) (*types.BulkStatusUpdateResponse, error)

	// GetDashboardStats retrieves admin dashboard stats
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

// NewReservationService creates a new instance of ReservationService
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
	// Security: If user is not admin, they should only see their own - handled by controller/calling layer usually,
	// but here we can enforce it if userID is passed in query.
	// The plan says "GET /reservations: ... user_id (admin), equipment_id...".
	// We assume the Controller sets query.UserID to the requester's ID if they are not admin.

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

	// Authorization check
	// User can only view their own
	if role != auth.RoleAdmin && role != auth.RoleSuperAdmin && res.UserID != userID {
		return nil, types.NewForbiddenError("You are not allowed to view this reservation")
	}

	return res, nil
}

// Create creates new reservations (transactional logic handled by DB RPC)
func (s *reservationService) Create(ctx context.Context, cmd types.CreateReservationsCommand, userID string) (*types.CreateReservationsResponse, error) {
	// Target User: Admin can create for others, otherwise for self
	targetUserID := userID
	if cmd.UserID != nil && *cmd.UserID != "" {
		// Verify requester is admin? Controller should check this.
		// We assume if cmd.UserID is set, the caller has verified permission to set it.
		targetUserID = *cmd.UserID
	}

	// Check if free reservation requested
	isFreeReservation := cmd.FreeReservation != nil && *cmd.FreeReservation

	// 1. Validation & Cost Calculation (Read-Only)
	totalCost := int32(0)
	costMap := make(map[int]int32)

	if !isFreeReservation {
		// Only calculate cost if not free
		for i, req := range cmd.Reservations {
			eq, err := s.equipmentRepo.GetByID(ctx, req.EquipmentID)
			if err != nil {
				return nil, types.NewValidationError(fmt.Sprintf("Equipment %s not found", req.EquipmentID), nil)
			}
			if eq.IsArchived || eq.Status == constants.EquipmentStatusBroken {
				return nil, types.NewValidationError(fmt.Sprintf("Equipment %s is not available", safeString(eq.Name)), nil)
			}

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
		}
	} else {
		// For free reservations, set all costs to 0
		for i := range cmd.Reservations {
			costMap[i] = 0
		}
		logger.Infof(ctx, "Creating free reservation for user %s", targetUserID)
	}

	// 2. Execute Atomic Transaction (RPC)
	// This handles balance check, deduction, concurrency check, and creation.
	reservationIDs, newBalance, err := s.repo.CreateReservationsAtomic(ctx, targetUserID, totalCost, isFreeReservation, cmd.Reservations)
	if err != nil {
		// Map RPC errors if possible, or return internal.
		// If RPC returns "Insufficient credits", we could map it.
		// For now return as internal or error.
		return nil, types.NewConflictError("Reservation failed: "+err.Error(), nil)
	}

	// 3. Construct Response
	// We lack full details of created items (e.g. timestamps) unless we fetch them back.
	// But we have IDs.
	// For performance, we can construct the response from input + IDs. create_at will be missing or now().

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

		// Fetch user email if not available. ideally passed in or we fetch profile.
		// We have targetUserID.
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
	current, err := s.repo.GetReservationByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Permissions
	// Admin can do anything.
	// User can only update OWN reservation.
	// User can only update if status is PENDING.
	// User can only cancel (Status -> DENIED/CANCELLED?).
	// Plan says: "User ... Can only cancel (status -> DENIED)".
	// Wait, plan says "PATCH /reservations/:id ... status: DENIED".

	isAdmin := role == auth.RoleAdmin || role == auth.RoleSuperAdmin
	isOwner := current.UserID == userID

	if !isAdmin && !isOwner {
		return nil, types.NewForbiddenError("Not allowed")
	}

	if !isAdmin {
		// User constraints
		if current.Status != constants.ReservationStatusPending {
			return nil, types.NewForbiddenError("Cannot modify non-pending reservation")
		}
		// User can only change Status to DENIED (Cancel)
		// User might change dates? Plan says "If dates change: Check availability...".
		// Plan "User ... Can only update own PENDING reservations".
	}

	updateData := types.PublicReservationsUpdate{}
	needsUpdate := false

	// Handle Status Change
	if cmd.Status != nil && *cmd.Status != current.Status {
		if !isAdmin && *cmd.Status != constants.ReservationStatusDenied && *cmd.Status != constants.ReservationStatusReturned {
			// User tried to set something other than DENIED or RETURNED
			// Users can cancel (DENIED) or return (RETURNED) their own pending reservations
			return nil, types.NewValidationError("Users can only cancel or return pending reservations", nil)
		}
		updateData.Status = cmd.Status
		needsUpdate = true

		// If cancelling (DENIED), refund credits?
		if *cmd.Status == constants.ReservationStatusDenied || *cmd.Status == constants.ReservationStatusCancelled {
			// Refund logic: Calculate cost and refund
			eq, errEq := s.equipmentRepo.GetByID(ctx, current.EquipmentID)
			if errEq != nil {
				logger.Errorf(ctx, "Refund failed: equipment %s not found", current.EquipmentID)
			} else {
				eqType, errType := s.equipmentRepo.GetTypeByID(ctx, eq.TypeID)
				if errType != nil {
					logger.Errorf(ctx, "Refund failed: equipment type %s not found", eq.TypeID)
				} else {
					days := s.calculateDays(current.StartDate, current.EndDate)
					refundAmount := days * eqType.CreditCostPerDay

					if refundAmount > 0 {
						if err := s.repo.RefundCredits(ctx, id, refundAmount); err != nil {
							logger.Errorf(ctx, "Failed to refund %d credits for reservation %s: %v", refundAmount, id, err)
						} else {
							logger.Infof(ctx, "Refunded %d credits for reservation %s", refundAmount, id)
						}
					}
				}
			}
		}
	}

	// Handle Date Change
	datesChanging := (cmd.StartDate != nil && *cmd.StartDate != current.StartDate) || (cmd.EndDate != nil && *cmd.EndDate != current.EndDate)
	dateOnlyChange := datesChanging && cmd.Status == nil

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

		// If ONLY dates are changing (no status change), use the atomic credit adjustment function
		if dateOnlyChange {
			result, err := s.repo.ModifyReservationDatesWithCredits(ctx, id, userID, start, end)
			if err != nil {
				logger.Errorf(ctx, "Failed to modify dates with credits: %v", err)
				return nil, err
			}

			// Log successful credit adjustment
			if result.CreditAdjustment != 0 {
				if result.CreditAdjustment > 0 {
					logger.Infof(ctx, "Refunded %d credits for shortening reservation %s", result.CreditAdjustment, id)
				} else {
					logger.Infof(ctx, "Charged %d credits for extending reservation %s", -result.CreditAdjustment, id)
				}
			}

			//  Calculate new credit cost for response
			eq, _ := s.equipmentRepo.GetByID(ctx, current.EquipmentID)
			eqType, _ := s.equipmentRepo.GetTypeByID(ctx, eq.TypeID)
			days := s.calculateDays(start, end)
			newCost := days * eqType.CreditCostPerDay

			return &types.UpdateReservationResponse{
				ID:               result.ID,
				EquipmentID:      current.EquipmentID,
				StartDate:        result.StartDate,
				EndDate:          result.EndDate,
				Status:           result.Status,
				CreditCost:       newCost,
				CreditAdjustment: result.CreditAdjustment,
				RemainingBalance: result.NewBalance,
				UpdatedAt:        result.UpdatedAt,
			}, nil
		}

		// If both dates AND status are changing, just update dates in the update data
		// Status change refund logic will handle credits
		updateData.StartDate = &start
		updateData.EndDate = &end
		needsUpdate = true
	}

	if !needsUpdate {
		return nil, nil // Or return current
	}

	updated, err := s.repo.UpdateReservation(ctx, id, updateData, userID)
	if err != nil {
		return nil, err
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
		ID:          updated.ID,
		EquipmentID: updated.EquipmentID,
		StartDate:   updated.StartDate,
		EndDate:     updated.EndDate,
		Status:      updated.Status,
		CreditCost:  creditCost,
		UpdatedAt:   safeString(updated.UpdatedAt),
	}, nil
}

// BulkUpdate updates multiple reservations
func (s *reservationService) BulkUpdate(ctx context.Context, cmd types.BulkUpdateReservationsCommand, adminID string) (*types.BulkStatusUpdateResponse, error) {
	return s.repo.BulkUpdateStatusAtomic(ctx, cmd.ReservationIDs, cmd.Status, adminID)
}

// GetDashboardStats retrieves admin dashboard stats
func (s *reservationService) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
	return s.repo.GetDashboardStats(ctx)
}

// Helper: Calculate days between two dates strings YYYY-MM-DD
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
