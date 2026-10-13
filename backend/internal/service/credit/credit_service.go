package credit

import (
	"context"
	"math"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
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
	page := query.Page
	if page < 1 {
		page = constants.DefaultPage
	}
	perPage := query.PerPage
	if perPage <= 0 {
		perPage = constants.DefaultPerPage
	}
	// Validate allowed per_page values as per requirement (10, 25, 50, 100)
	// If the user requests a non-standard per_page, we return a validation error.
	// Note: We only return error if it was explicitly provided (i.e., passed from handler) and invalid.
	// If 0 was passed (meaning not provided), we defaulted it above.
	// Validate allowed per_page values as per requirement (10, 25, 50, 100)
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
	// 2. Determine Target User (Authorization Logic for Data Access)
	targetUserID := requestingUserID
	if query.UserID != nil && *query.UserID != "" {
		if *query.UserID != requestingUserID && userRole != auth.RoleAdmin && userRole != auth.RoleSuperAdmin {
			return nil, types.NewForbiddenError("Only admins can filter by user_id")
		}
		targetUserID = *query.UserID
	}
	// 3. Fetch Credit History
	// Pass targetUserID pointer to repository.
	history, totalItems, err := s.creditRepo.GetCreditHistory(ctx, &targetUserID, page, perPage)
	if err != nil {
		return nil, err
	}
	// 4. Fetch Current Balance (from User Profile)
	// We fetch the profile of the target user to show their current balance.
	logger.Debugf(ctx, "CreditService: Fetching profile for balance check. TargetUserID: %s", targetUserID)
	userProfile, err := s.userRepo.GetByID(ctx, targetUserID)
	if err != nil {
		logger.Errorf(ctx, "CreditService: Failed to fetch profile for %s: %v", targetUserID, err)
		return nil, types.NewNotFoundError("User", targetUserID)
	}
	logger.Debugf(ctx, "CreditService: Profile found. Balance: %d", userProfile.CreditBalance)
	// 5. Build Response
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
