package mocks

import (
	"context"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockUserRepository implements repository.UserRepository
type MockUserRepository struct {
	mock.Mock
}

// Ensure mock implements interface
var _ repository.UserRepository = (*MockUserRepository)(nil)

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

func (m *MockUserRepository) BulkAdjustCreditsAtomic(ctx context.Context, userIDs []string, adminID string, amount int32, reason string, description string) error {
	args := m.Called(ctx, userIDs, adminID, amount, reason, description)
	return args.Error(0)
}
