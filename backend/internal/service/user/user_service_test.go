package user

import (
	"context"
	"testing"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockUserRepository is a mock implementation of UserRepository
type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) List(ctx context.Context, page, perPage int, role, search string) ([]types.PublicProfilesSelect, int64, error) {
	args := m.Called(ctx, page, perPage, role, search)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]types.PublicProfilesSelect), args.Get(1).(int64), args.Error(2)
}

func (m *MockUserRepository) GetByID(ctx context.Context, id string) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

func (m *MockUserRepository) Create(ctx context.Context, profile types.PublicProfilesInsert) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, profile)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, id string, profile types.PublicProfilesUpdate) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, id, profile)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

func TestGetProfile_Success(t *testing.T) {
	mockRepo := new(MockUserRepository)
	service := NewUserService(mockRepo)
	ctx := context.Background()

	id := "user-123"
	email := "test@example.com"
	role := "user"
	mockRepo.On("GetByID", ctx, id).Return(&types.PublicProfilesSelect{
		ID:    id,
		Email: email,
		Role:  role,
	}, nil)

	resp, err := service.GetProfile(ctx, id)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, id, resp.ID)
	assert.Equal(t, email, resp.Email)
	mockRepo.AssertExpectations(t)
}

func TestGetProfile_NotFound(t *testing.T) {
	mockRepo := new(MockUserRepository)
	service := NewUserService(mockRepo)
	ctx := context.Background()

	id := "unknown"
	mockRepo.On("GetByID", ctx, id).Return(nil, types.NewNotFoundError("User", id))

	resp, err := service.GetProfile(ctx, id)

	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.IsType(t, &types.NotFoundError{}, err)
	mockRepo.AssertExpectations(t)
}

func TestListUsers_Success(t *testing.T) {
	mockRepo := new(MockUserRepository)
	service := NewUserService(mockRepo)
	ctx := context.Background()

	page := 1
	perPage := 10
	role := "admin"
	search := ""

	mockProfiles := []types.PublicProfilesSelect{
		{ID: "1", Username: "User1", Role: "admin"},
		{ID: "2", Username: "User2", Role: "admin"},
	}

	mockRepo.On("List", ctx, page, perPage, role, search).
		Return(mockProfiles, int64(2), nil)

	resp, err := service.ListUsers(ctx, page, perPage, role, search)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, 2, len(resp.Users))
	assert.Equal(t, int(2), resp.Pagination.TotalItems)
	mockRepo.AssertExpectations(t)
}

func TestCreateUser_Success(t *testing.T) {
	mockRepo := new(MockUserRepository)
	service := NewUserService(mockRepo)
	ctx := context.Background()

	email := "new@example.com"
	username := "newuser"
	role := auth.RoleUser
	credit := int32(50)

	req := types.CreateUserRequest{
		Email:         email,
		Username:      username,
		Role:          role,
		CreditBalance: &credit,
	}

	// 1. Check Email - expect NotFound (which means we can proceed)
	mockRepo.On("GetByEmail", ctx, email).Return(nil, types.NewNotFoundError("User", email))

	// 2. Check Username via List - expect empty list or list without our username
	mockRepo.On("List", ctx, 1, 1, "", username).Return([]types.PublicProfilesSelect{}, int64(0), nil)

	// 3. Create
	mockRepo.On("Create", ctx, mock.AnythingOfType("types.PublicProfilesInsert")).
		Return(&types.PublicProfilesSelect{
			ID:            "generated-id",
			Email:         email,
			Username:      username,
			Role:          role,
			CreditBalance: credit,
		}, nil)

	resp, err := service.CreateUser(ctx, req)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, "generated-id", resp.ID)
	assert.Equal(t, email, resp.Email)
	assert.Equal(t, credit, resp.CreditBalance)
	mockRepo.AssertExpectations(t)
}

func TestCreateUser_EmailConflict(t *testing.T) {
	mockRepo := new(MockUserRepository)
	service := NewUserService(mockRepo)
	ctx := context.Background()

	email := "existing@example.com"
	req := types.CreateUserRequest{
		Email:    email,
		Username: "user",
		Role:     auth.RoleUser,
	}

	// 1. Check Email - found existing user
	mockRepo.On("GetByEmail", ctx, email).Return(&types.PublicProfilesSelect{ID: "1", Email: email}, nil)

	resp, err := service.CreateUser(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.IsType(t, &types.ConflictError{}, err)
	assert.Contains(t, err.Error(), "email already exists")
	mockRepo.AssertExpectations(t)
}

func TestCreateUser_UsernameConflict(t *testing.T) {
	mockRepo := new(MockUserRepository)
	service := NewUserService(mockRepo)
	ctx := context.Background()

	username := "existinguser"
	req := types.CreateUserRequest{
		Email:    "new@example.com",
		Username: username,
		Role:     auth.RoleUser,
	}

	// 1. Check Email - not found
	mockRepo.On("GetByEmail", ctx, req.Email).Return(nil, types.NewNotFoundError("User", req.Email))

	// 2. Check Username - found existing
	mockRepo.On("List", ctx, 1, 1, "", username).Return([]types.PublicProfilesSelect{
		{ID: "1", Username: username},
	}, int64(1), nil)

	resp, err := service.CreateUser(ctx, req)

	assert.Error(t, err)
	assert.Nil(t, resp)
	assert.IsType(t, &types.ConflictError{}, err)
	assert.Contains(t, err.Error(), "username already exists")
	mockRepo.AssertExpectations(t)
}

func TestUpdateUser_Success(t *testing.T) {
	mockRepo := new(MockUserRepository)
	service := NewUserService(mockRepo)
	ctx := context.Background()

	id := "user-123"
	role := auth.RoleAdmin

	req := types.UpdateUserRequest{
		Role: &role,
	}

	// We expect Check for existence first
	mockRepo.On("GetByID", ctx, id).Return(&types.PublicProfilesSelect{ID: id}, nil)

	mockRepo.On("Update", ctx, id, mock.AnythingOfType("types.PublicProfilesUpdate")).
		Return(&types.PublicProfilesSelect{
			ID:   id,
			Role: role,
		}, nil)

	resp, err := service.UpdateUser(ctx, id, req)

	assert.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, role, resp.Role)
	mockRepo.AssertExpectations(t)
}
