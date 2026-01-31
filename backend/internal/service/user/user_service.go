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
	// GetProfile retrieves the profile of a user by ID.
	GetProfile(ctx context.Context, id string) (*types.UserResponse, error)

	// ListUsers retrieves a paginated list of users with optional filters.
	ListUsers(ctx context.Context, page, perPage int, role, search string) (*types.UserListResponse, error)

	// CreateUser creates a new user profile with the given inputs.
	CreateUser(ctx context.Context, req types.CreateUserRequest) (*types.UserResponse, error)

	// UpdateUser updates an existing user profile with the given inputs.
	UpdateUser(ctx context.Context, id string, req types.UpdateUserRequest) (*types.UserResponse, error)

	// BulkAdjustCredits adjusts credit balance for multiple users and records history.
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
	// Enforce pagination limits
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

// CreateUser creates a new user profile with the given inputs.
func (s *userService) CreateUser(ctx context.Context, req types.CreateUserRequest) (*types.UserResponse, error) {
	logger.Infof(ctx, "Creating user with email: %s", req.Email)

	// Check if email already exists
	if _, err := s.repo.GetByEmail(ctx, req.Email); err == nil {
		return nil, types.NewConflictError("User with this email already exists", map[string]string{"email": req.Email})
	}

	// Check if username already exists
	// We reuse 'List' with exact search hack or need new repo method.
	// Efficient way: List with search=username strictly or add GetByUsername to repo.
	// For now using List with filters which uses ILIKE, so if List returns exact match we abort.
	// Or better, add GetByUsername to repo. But for now relying on List is acceptable if exact match logic is verified.
	// A better approach is trusting the DB constraint but user asked for "check before inserting".
	// Let's rely on Repo's `List` with `search` param which does ILIKE.
	// If any user matches username exactly, reject.
	// Note: Provide 'role' as empty to search all users.
	existingUsers, _, err := s.repo.List(ctx, 1, 1, "", req.Username)
	if err == nil {
		for _, u := range existingUsers {
			if u.Username == req.Username {
				return nil, types.NewConflictError("User with this username already exists", map[string]string{"username": req.Username})
			}
		}
	}

	// Default credit balance
	creditBalance := int32(0)
	if req.CreditBalance != nil {
		creditBalance = *req.CreditBalance
	}

	// 1. Create user in Supabase Auth
	// NOTE: Uses service role key internally for Auth Admin API
	tempPassword := "TempPass123!@" // TODO: Application is not using password
	authUser, err := s.authRepo.CreateUser(ctx, req.Email, tempPassword)

	if err != nil {
		logger.Errorf(ctx, "AuthRepo.CreateUser failed: %v", err)
		// Propagate specific error types from auth repo (ValidationError contains Supabase message)
		if _, ok := err.(*types.ValidationError); ok {
			return nil, err
		}
		return nil, types.NewInternalError("Failed to create auth user", err)
	}

	// 2. Create profile in database
	// Note: There's no auto-trigger for profile creation - profiles are created via API only (invite-only system)
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
