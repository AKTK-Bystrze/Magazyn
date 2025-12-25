package credit

import (
	"context"
	"math"

	"magazyn/backend/internal/constants"
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
	// 1. Pagination Validation & Normalization
	page := query.Page
	if page < 1 {
		page = constants.DefaultPage
	}

	perPage := query.PerPage
	// Default validation if 0 or negative
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

	// If query.UserID is provided (and we assume caller has permission to ask, enforced in handler), use it.
	if query.UserID != nil && *query.UserID != "" {
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
	userProfile, err := s.userRepo.GetByID(ctx, targetUserID)
	if err != nil {
		// If the user doesn't exist, GetByID returns error.
		// Use standard NotFound handling if appropriate, or wrap it.
		// Since user_id comes from either context (exists) or filter (might not exist), this handles both.
		return nil, types.NewNotFoundError("User", targetUserID)
	}

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
