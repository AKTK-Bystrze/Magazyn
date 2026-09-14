package credit

import (
	"context"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

type CreditRequestService interface {
	ListRequests(ctx context.Context, page, perPage int) (*types.CreditRequestListResponse, error)
	CreateRequest(ctx context.Context, userID string, req types.CreateCreditRequestDTO) (*types.CreditRequestDTO, error)
	UpdateRequest(ctx context.Context, userID string, id string, req types.UpdateCreditRequestDTO) (*types.CreditRequestDTO, error)
	ReviewRequest(ctx context.Context, adminID string, id string, req types.ReviewCreditRequestDTO) error
	GetLeaderboard(ctx context.Context) ([]types.UserCreditLeaderboardItem, error)
}

type creditRequestService struct {
	repo        repository.CreditRequestRepository
	userService interface {
		BulkAdjustCredits(ctx context.Context, adminID string, req types.BulkAdjustCreditsRequest) error
	}
}

func NewCreditRequestService(repo repository.CreditRequestRepository, userService interface {
	BulkAdjustCredits(ctx context.Context, adminID string, req types.BulkAdjustCreditsRequest) error
}) CreditRequestService {
	return &creditRequestService{repo: repo, userService: userService}
}

func (s *creditRequestService) ListRequests(ctx context.Context, page, perPage int) (*types.CreditRequestListResponse, error) {
	if page < 1 {
		page = constants.DefaultPage
	}
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

	items, total, err := s.repo.ListRequests(ctx, page, perPage)
	if err != nil {
		return nil, err
	}

	totalPages := 0
	if perPage > 0 {
		totalPages = int((total + int64(perPage) - 1) / int64(perPage))
	}

	return &types.CreditRequestListResponse{
		Requests: items,
		Pagination: types.Pagination{
			Page:       page,
			PerPage:    perPage,
			TotalItems: int(total),
			TotalPages: totalPages,
		},
	}, nil
}

func (s *creditRequestService) CreateRequest(ctx context.Context, userID string, req types.CreateCreditRequestDTO) (*types.CreditRequestDTO, error) {
	if req.CreditsValue <= 0 {
		return nil, types.NewValidationError("credits_value must be strictly positive", map[string]int{"credits_value": int(req.CreditsValue)})
	}

	dto := types.CreditRequestDTO{
		Title:        req.Title,
		Description:  req.Description,
		CreditsValue: req.CreditsValue,
		RequestorID:  &userID,
		UserHelpedID: &req.UserHelpedID,
		Status:       types.CreditRequestStatusAwaiting,
		Helpers:      req.Helpers,
	}

	return s.repo.Create(ctx, dto)
}

func (s *creditRequestService) UpdateRequest(ctx context.Context, userID string, id string, req types.UpdateCreditRequestDTO) (*types.CreditRequestDTO, error) {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if existing.RequestorID == nil || *existing.RequestorID != userID {
		return nil, types.NewForbiddenError("You are not the requestor of this credit request")
	}

	if existing.Status != types.CreditRequestStatusAwaiting {
		return nil, types.NewForbiddenError("Only awaiting requests can be modified")
	}

	if req.CreditsValue != nil {
		if *req.CreditsValue <= 0 {
			return nil, types.NewValidationError("credits_value must be strictly positive", map[string]int{"credits_value": int(*req.CreditsValue)})
		}
		existing.CreditsValue = *req.CreditsValue
	}

	if req.Title != nil {
		existing.Title = *req.Title
	}
	if req.Description != nil {
		existing.Description = *req.Description
	}
	if req.UserHelpedID != nil {
		existing.UserHelpedID = req.UserHelpedID
	}
	if req.Helpers != nil {
		if len(req.Helpers) == 0 {
			return nil, types.NewValidationError("Helpers cannot be empty", nil)
		}
		existing.Helpers = req.Helpers
	}

	return s.repo.Update(ctx, id, *existing)
}

func (s *creditRequestService) ReviewRequest(ctx context.Context, adminID string, id string, req types.ReviewCreditRequestDTO) error {
	existing, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	if existing.Status != types.CreditRequestStatusAwaiting {
		return types.NewForbiddenError("Only awaiting requests can be reviewed")
	}

	if req.Status != types.CreditRequestStatusApproved && req.Status != types.CreditRequestStatusRejected && req.Status != types.CreditRequestStatusApprovedWithChanges {
		return types.NewValidationError("Invalid status", nil)
	}

	if req.CreditsValue != nil && *req.CreditsValue <= 0 {
		return types.NewValidationError("credits_value must be strictly positive", nil)
	}

	err = s.repo.UpdateStatus(ctx, id, req.Status, req.CreditsValue, req.Helpers)
	if err != nil {
		return err
	}

	if req.Status == types.CreditRequestStatusApproved || req.Status == types.CreditRequestStatusApprovedWithChanges {
		helpersToCredit := req.Helpers
		if helpersToCredit == nil {
			helpersToCredit = existing.Helpers
		}

		valToCredit := existing.CreditsValue
		if req.CreditsValue != nil {
			valToCredit = *req.CreditsValue
		}

		bulkReq := types.BulkAdjustCreditsRequest{
			UserIDs:     helpersToCredit,
			Amount:      valToCredit,
			Reason:      "work_credit",
			Description: existing.Title,
		}

		if err := s.userService.BulkAdjustCredits(ctx, adminID, bulkReq); err != nil {
			// If it fails, ideally we would rollback the status update, but we'll return the error for now
			return err
		}
	}

	return nil
}

func (s *creditRequestService) GetLeaderboard(ctx context.Context) ([]types.UserCreditLeaderboardItem, error) {
	return s.repo.GetLeaderboard(ctx)
}
