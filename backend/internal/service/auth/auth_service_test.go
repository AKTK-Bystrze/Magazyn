package auth

import (
	"context"
	"testing"

	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
)

func TestAuthService_Login(t *testing.T) {
	mockRepo := new(mocks.MockAuthRepository)
	service := NewAuthService(mockRepo)
	ctx := context.Background()
	email := "test@example.com"
	mockRepo.On("SendMagicLink", ctx, email).Return(nil)
	_, err := service.Login(ctx, email)
	assert.NoError(t, err)
	mockRepo.AssertExpectations(t)
}
func TestAuthService_GetSession(t *testing.T) {
	mockRepo := new(mocks.MockAuthRepository)
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
	mockRepo := new(mocks.MockAuthRepository)
	service := NewAuthService(mockRepo)
	ctx := context.Background()
	notFoundErr := types.NewNotFoundError("Profile", "user-123")
	mockRepo.On("GetProfile", ctx, "user-123", "token").Return(nil, notFoundErr)
	_, err := service.GetSession(ctx, "user-123", "token")
	assert.Error(t, err)
	assert.Equal(t, notFoundErr, err)
}
