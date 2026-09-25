package user

import (
	"context"
	"math"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

// ============================================================================
// User Service Interface
// ============================================================================

// UserService defines operations for user profile management.
type UserService interface {
	GetProfile(ctx context.Context, id string) (*types.UserResponse, error)

	ListUsers(ctx context.Context, page, perPage int, role, search string) (*types.UserListResponse, error)

	ListPublicUsers(ctx context.Context, page, perPage int, search string) (*types.PublicUserListResponse, error)

	CreateUser(ctx context.Context, req types.CreateUserRequest) (*types.UserResponse, error)

	UpdateUser(ctx context.Context, id string, req types.UpdateUserRequest) (*types.UserResponse, error)

	BulkAdjustCredits(ctx context.Context, adminID string, req types.BulkAdjustCreditsRequest) error
}

// ============================================================================
// User Service Implementation
// ============================================================================

type userService struct {
	repo       repository.UserRepository
	authRepo   repository.AuthRepository
	creditRepo repository.CreditHistoryRepository
}

// NewUserService creates a new instance of UserService.
func NewUserService(repo repository.UserRepository, authRepo repository.AuthRepository, creditRepo repository.CreditHistoryRepository) UserService {
	return &userService{
		repo:       repo,
		authRepo:   authRepo,
		creditRepo: creditRepo,
	}
}

// BulkAdjustCredits adjusts credit balance for multiple users and records history atomically.
func (s *userService) BulkAdjustCredits(ctx context.Context, adminID string, req types.BulkAdjustCreditsRequest) error {
	logger.Infof(ctx, "Bulk adjusting credits for %d users by %d", len(req.UserIDs), req.Amount)

	err := s.repo.BulkAdjustCreditsAtomic(ctx, req.UserIDs, adminID, req.Amount, req.Reason, req.Description)
	if err != nil {
		logger.Errorf(ctx, "Bulk adjustment failed: %v", err)
		return types.NewInternalError("Failed to adjust credits", err)
	}

	return nil
}

// GetProfile retrieves the profile of a user by ID.
func (s *userService) GetProfile(ctx context.Context, id string) (*types.UserResponse, error) {
	logger.Infof(ctx, "Fetching user profile for ID: %s", id)

	profile, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, types.NewNotFoundError("User", id)
	}

	return s.mapToUserResponse(profile), nil
}

// ListUsers retrieves a paginated list of users with optional filters.
func (s *userService) ListUsers(ctx context.Context, page, perPage int, role, search string) (*types.UserListResponse, error) {
	if page < 1 {
		page = constants.DefaultPage
	}
	if perPage < 1 {
		perPage = constants.DefaultPerPage
	}
	if perPage > constants.MaxPerPage {
		perPage = constants.MaxPerPage
	}

	logger.Infof(ctx, "Listing users - Page: %d, PerPage: %d, Role: %s, Search: %s", page, perPage, role, search)

	profiles, totalItems, err := s.repo.List(ctx, page, perPage, role, search)
	if err != nil {
		logger.Errorf(ctx, "Failed to list users: %v", err)
		return nil, types.NewInternalError("Failed to list users", err)
	}

	userResponses := make([]types.UserResponse, len(profiles))
	for i, p := range profiles {
		userResponses[i] = *s.mapToUserResponse(&p)
	}

	totalPages := int(math.Ceil(float64(totalItems) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	return &types.UserListResponse{
		Users: userResponses,
		Pagination: types.Pagination{
			Page:       page,
			PerPage:    perPage,
			TotalItems: int(totalItems),
			TotalPages: totalPages,
		},
	}, nil
}

// ListPublicUsers retrieves a paginated list of public users with optional search.
func (s *userService) ListPublicUsers(ctx context.Context, page, perPage int, search string) (*types.PublicUserListResponse, error) {
	if page < 1 {
		page = constants.DefaultPage
	}
	if perPage < 1 {
		perPage = constants.DefaultPerPage
	}
	if perPage > constants.MaxPerPage {
		perPage = constants.MaxPerPage
	}

	logger.Infof(ctx, "Listing public users - Page: %d, PerPage: %d, Search: %s", page, perPage, search)

	profiles, totalItems, err := s.repo.List(ctx, page, perPage, "", search)
	if err != nil {
		logger.Errorf(ctx, "Failed to list public users: %v", err)
		return nil, types.NewInternalError("Failed to list public users", err)
	}

	userResponses := make([]types.PublicUserResponse, len(profiles))
	for i, p := range profiles {
		userResponses[i] = types.PublicUserResponse{
			ID:            p.ID,
			Username:      p.Username,
			CreditBalance: p.CreditBalance,
		}
	}

	totalPages := int(math.Ceil(float64(totalItems) / float64(perPage)))
	if totalPages < 1 {
		totalPages = 1
	}

	return &types.PublicUserListResponse{
		Users: userResponses,
		Pagination: types.Pagination{
			Page:       page,
			PerPage:    perPage,
			TotalItems: int(totalItems),
			TotalPages: totalPages,
		},
	}, nil
}

// CreateUser creates a new user profile with the given inputs.
func (s *userService) CreateUser(ctx context.Context, req types.CreateUserRequest) (*types.UserResponse, error) {
	logger.Infof(ctx, "Creating user with email: %s", req.Email)

	if _, err := s.repo.GetByEmail(ctx, req.Email); err == nil {
		return nil, types.NewConflictError("User with this email already exists", map[string]string{"email": req.Email})
	}

	existingUsers, _, err := s.repo.List(ctx, 1, 1, "", req.Username)
	if err == nil {
		for _, u := range existingUsers {
			if u.Username == req.Username {
				return nil, types.NewConflictError("User with this username already exists", map[string]string{"username": req.Username})
			}
		}
	}

	creditBalance := int32(0)
	if req.CreditBalance != nil {
		creditBalance = *req.CreditBalance
	}

	tempPassword := "TempPass123!@" // TODO: Application is not using password
	authUser, err := s.authRepo.CreateUser(ctx, req.Email, tempPassword)

	if err != nil {
		logger.Errorf(ctx, "AuthRepo.CreateUser failed: %v", err)
		if _, ok := err.(*types.ValidationError); ok {
			return nil, err
		}
		return nil, types.NewInternalError("Failed to create auth user", err)
	}

	profileInsert := types.PublicProfilesInsert{
		ID:            authUser.ID,
		Email:         req.Email,
		Username:      req.Username,
		Role:          &req.Role,
		CreditBalance: &creditBalance,
		IsEnabled:     req.IsEnabled,
	}

	created, err := s.repo.Create(ctx, profileInsert)
	if err != nil {
		logger.Errorf(ctx, "Failed to create profile: %v", err)
		return nil, types.NewInternalError("Failed to create profile", err)
	}

	return s.mapToUserResponse(created), nil
}

// UpdateUser updates an existing user profile with the given inputs.
func (s *userService) UpdateUser(ctx context.Context, id string, req types.UpdateUserRequest) (*types.UserResponse, error) {
	logger.Infof(ctx, "Updating user ID: %s", id)

	_, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return nil, types.NewNotFoundError("User", id)
	}

	update := types.PublicProfilesUpdate{
		Email:         req.Email,
		Role:          req.Role,
		CreditBalance: req.CreditBalance,
		IsEnabled:     req.IsEnabled,
	}

	updated, err := s.repo.Update(ctx, id, update)
	if err != nil {
		return nil, types.NewInternalError("Failed to update user profile", err)
	}

	return s.mapToUserResponse(updated), nil
}

// mapToUserResponse maps the database entity to the API response DTO.
func (s *userService) mapToUserResponse(p *types.PublicProfilesSelect) *types.UserResponse {
	return &types.UserResponse{
		ID:            p.ID,
		Email:         p.Email,
		Username:      p.Username,
		Role:          p.Role,
		CreditBalance: p.CreditBalance,
		IsEnabled:     p.IsEnabled,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
	}
}
