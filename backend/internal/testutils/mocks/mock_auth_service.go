package mocks

import (
	"context"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockAuthService is a mock implementation of AuthService for testing.
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Login(ctx context.Context, email string) (*types.LoginResponse, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.LoginResponse), args.Error(1)
}

func (m *MockAuthService) Logout(ctx context.Context, token string) error {
	args := m.Called(ctx, token)
	return args.Error(0)
}

func (m *MockAuthService) GetSession(ctx context.Context, userID string, userToken string) (*types.SessionResponse, error) {
	args := m.Called(ctx, userID, userToken)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.SessionResponse), args.Error(1)
}

func (m *MockAuthService) VerifyOTP(ctx context.Context, email, token string, otpType string) (*types.SessionResponse, error) {
	args := m.Called(ctx, email, token, otpType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.SessionResponse), args.Error(1)
}
