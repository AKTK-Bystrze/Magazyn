package auth

import (
	"context"
	"testing"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

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

func (m *MockAuthRepository) VerifyOTP(ctx context.Context, email, token, otpType string) (*types.Session, error) {
	args := m.Called(ctx, email, token, otpType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.Session), args.Error(1)
}

func (m *MockAuthRepository) GetUser(ctx context.Context, token string) (*types.User, error) {
	args := m.Called(ctx, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.User), args.Error(1)
}

func (m *MockAuthRepository) GetProfile(ctx context.Context, userID string, token string) (*types.PublicProfilesSelect, error) {
	args := m.Called(ctx, userID, token)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.PublicProfilesSelect), args.Error(1)
}

func TestAuthService_Login(t *testing.T) {
	mockRepo := new(MockAuthRepository)
	service := NewAuthService(mockRepo)
	ctx := context.Background()
	email := "test@example.com"

	mockRepo.On("SendMagicLink", ctx, email).Return(nil)

	_, err := service.Login(ctx, email)

	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}

func TestAuthService_GetSession(t *testing.T) {
	mockRepo := new(MockAuthRepository)
	service := NewAuthService(mockRepo)
	ctx := context.Background()
	userID := "user-123"
	token := "valid-token"

	profile := &types.PublicProfilesSelect{
		ID:            userID,
		Email:         "test@example.com",
		Username:      "testuser",
		Role:          "user",
		CreditBalance: 100,
		IsEnabled:     true,
	}

	mockRepo.On("GetProfile", ctx, userID, token).Return(profile, nil)

	session, err := service.GetSession(ctx, userID, token)

	assert.NoError(t, err)
	assert.Equal(t, userID, session.UserID)
	assert.Equal(t, "testuser", session.Username)
	assert.NotEmpty(t, session.ExpiresAt)
	mockRepo.AssertExpectations(t)
}

func TestAuthService_GetSession_ProfileNotFound(t *testing.T) {
	mockRepo := new(MockAuthRepository)
	service := NewAuthService(mockRepo)
	ctx := context.Background()

	mockRepo.On("GetProfile", ctx, "user-123", "token").Return(nil, types.ErrProfileNotFound)

	_, err := service.GetSession(ctx, "user-123", "token")

	assert.Error(t, err)
	assert.Equal(t, types.ErrProfileNotFound, err)
}
