// Package reservation handles business rules validation, credit calculation, and orchestrates operations
// between repositories.
package reservation

import (
	"context"
	"strings"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/service/email"
	"magazyn/backend/internal/types"
)

// ReservationService defines operations for managing reservations.
type ReservationService interface {
	List(ctx context.Context, query types.ReservationListQuery, userID string, role string) (*types.ReservationListResponse, error)
	GetByID(ctx context.Context, id string, userID string, role string) (*types.ReservationDetail, error)
	Create(ctx context.Context, cmd types.CreateReservationsCommand, userID string, role string) (*types.CreateReservationsResponse, error)
	Update(ctx context.Context, id string, cmd types.UpdateReservationCommand, userID string, role string) (*types.UpdateReservationResponse, error)
	BulkUpdate(ctx context.Context, cmd types.BulkUpdateReservationsCommand, adminID string) (*types.BulkStatusUpdateResponse, error)
	GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error)
}

type reservationService struct {
	repo          repository.ReservationRepository
	equipmentRepo repository.EquipmentRepository
	userRepo      repository.UserRepository
	emailService  email.Service
}

// NewReservationService creates a new instance of ReservationService.
func NewReservationService(
	repo repository.ReservationRepository,
	equipmentRepo repository.EquipmentRepository,
	userRepo repository.UserRepository,
	emailService email.Service,
) ReservationService {
	return &reservationService{
		repo:          repo,
		equipmentRepo: equipmentRepo,
		userRepo:      userRepo,
		emailService:  emailService,
	}
}

// List retrieves a paginated list of reservations based on query filters and scope.
// When scope="all", RLS is bypassed to allow any authenticated user to browse all reservations.
// When scope="my" (or empty), results are scoped to the caller's userID.
func (s *reservationService) List(ctx context.Context, query types.ReservationListQuery, userID string, _ string) (*types.ReservationListResponse, error) {
	if query.Scope != nil && *query.Scope == "all" {
		query.BypassRLS = true
	} else if userID != "" {
		query.UserID = &userID
	}
	items, total, err := s.repo.GetReservations(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "Failed to list reservations: %v", err)
		if strings.Contains(err.Error(), "22P02") || strings.Contains(err.Error(), "invalid input value for enum") || strings.Contains(err.Error(), "invalid input syntax") {
			return nil, types.NewValidationError("Invalid reservation filter", map[string]interface{}{"error": err.Error()})
		}
		return nil, types.NewInternalError("Failed to list reservations", err)
	}
	totalPages := 0
	if query.PerPage > 0 {
		totalPages = int((total + int64(query.PerPage) - 1) / int64(query.PerPage))
	}
	return &types.ReservationListResponse{
		Reservations: items,
		Pagination: types.Pagination{
			Page:       query.Page,
			PerPage:    query.PerPage,
			TotalItems: int(total),
			TotalPages: totalPages,
		},
	}, nil
}

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

func (s *reservationService) BulkUpdate(ctx context.Context, cmd types.BulkUpdateReservationsCommand, adminID string) (*types.BulkStatusUpdateResponse, error) {
	return s.repo.BulkUpdateStatusAtomic(ctx, cmd.ReservationIDs, cmd.Status, adminID)
}

func (s *reservationService) GetDashboardStats(ctx context.Context) (*types.ReservationDashboardSummary, error) {
	return s.repo.GetDashboardStats(ctx)
}
func safeString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
