package credit

import (
	"context"
	"math"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

// CreditHistoryService defines operations for querying credit history.
type CreditHistoryService interface {
	GetCreditHistory(ctx context.Context, query types.GetCreditHistoryQuery, requestingUserID string, userRole string) (*types.CreditHistoryResponse, error)
}

type creditHistoryService struct {
	creditRepo repository.CreditHistoryRepository
	userRepo   repository.UserRepository
}

// NewCreditHistoryService creates a new instance of CreditHistoryService.
func NewCreditHistoryService(creditRepo repository.CreditHistoryRepository, userRepo repository.UserRepository) CreditHistoryService {
	return &creditHistoryService{
		creditRepo: creditRepo,
		userRepo:   userRepo,
	}
}

func (s *creditHistoryService) GetCreditHistory(ctx context.Context, query types.GetCreditHistoryQuery, requestingUserID string, userRole string) (*types.CreditHistoryResponse, error) {
	logger.Infof(ctx, "Fetching credit history (reqUser: %s) - Page: %d, PerPage: %d", requestingUserID, query.Page, query.PerPage)
	page, perPage, err := validation.ValidatePagination(query.Page, query.PerPage)
	if err != nil {
		return nil, err
	}
	targetUserID := requestingUserID
	if query.UserID != nil && *query.UserID != "" {
		if *query.UserID != requestingUserID && userRole != auth.RoleAdmin && userRole != auth.RoleSuperAdmin {
			return nil, types.NewForbiddenError("Only admins can filter by user_id")
		}
		targetUserID = *query.UserID
	}
	history, totalItems, err := s.creditRepo.GetCreditHistory(ctx, &targetUserID, page, perPage)
	if err != nil {
		return nil, err
	}
	logger.Debugf(ctx, "CreditService: Fetching profile for balance check. TargetUserID: %s", targetUserID)
	userProfile, err := s.userRepo.GetByID(ctx, targetUserID)
	if err != nil {
		logger.Errorf(ctx, "CreditService: Failed to fetch profile for %s: %v", targetUserID, err)
		return nil, types.NewNotFoundError("User", targetUserID)
	}
	logger.Debugf(ctx, "CreditService: Profile found. Balance: %d", userProfile.CreditBalance)
	totalPages := 0
	if perPage > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(perPage)))
	}
	return &types.CreditHistoryResponse{
		CreditHistory: history,
		Pagination: types.Pagination{
			Page:       page,
			PerPage:    perPage,
			TotalItems: int(totalItems),
			TotalPages: totalPages,
		},
		CurrentBalance: userProfile.CreditBalance,
	}, nil
}
