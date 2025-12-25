package mocks

import (
	"context"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockAuthRepository mocks repository.AuthRepository
type MockAuthRepository struct {
	mock.Mock
}

func (m *MockAuthRepository) SendMagicLink(ctx context.Context, email string) error {
	args := m.Called(ctx, email)
	return args.Error(0)
}

func (m *MockAuthRepository) Logout(ctx context.Context, token string) error {
	args := m.Called(ctx, token)
	return args.Error(0)
}

func (m *MockAuthRepository) GetUser(ctx context.Context, token string) (*types.User, error) {
	args := m.Called(ctx, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.User), args.Error(1)
}

func (m *MockAuthRepository) CreateUser(ctx context.Context, email, password string) (*types.User, error) {
	args := m.Called(ctx, email, password)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.User), args.Error(1)
}

func (m *MockAuthRepository) VerifyOTP(ctx context.Context, email, token string, otpType string) (*types.Session, error) {
	args := m.Called(ctx, email, token, otpType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.Session), args.Error(1)
}

func (m *MockAuthRepository) GetProfile(ctx context.Context, userID string, token string) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, userID, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}
