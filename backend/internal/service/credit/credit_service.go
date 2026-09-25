package credit

import (
	"context"
	"math"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

// CreditHistoryService defines the business logic for credit history retrieval.
type CreditHistoryService interface {
	GetCreditHistory(ctx context.Context, query types.GetCreditHistoryQuery, requestingUserID string) (*types.CreditHistoryResponse, error)
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

// GetCreditHistory retrieves credit history based on the provided query and user context.
func (s *creditHistoryService) GetCreditHistory(ctx context.Context, query types.GetCreditHistoryQuery, requestingUserID string) (*types.CreditHistoryResponse, error) {
	logger.Infof(ctx, "Fetching credit history (reqUser: %s) - Page: %d, PerPage: %d", requestingUserID, query.Page, query.PerPage)
	page := query.Page
	if page < 1 {
		page = constants.DefaultPage
	}

	perPage := query.PerPage
	if perPage <= 0 {
		perPage = constants.DefaultPerPage
	}

	isAllowed := false
	for _, val := range constants.AllowedPerPageValues {
		if perPage == val {
			isAllowed = true
			break
		}
	}

	if !isAllowed {
		return nil, types.NewValidationError("Invalid per_page value. Allowed: 10, 25, 50, 100", map[string]int{"per_page": perPage})
	}

	targetUserID := requestingUserID

	if query.UserID != nil && *query.UserID != "" {
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
