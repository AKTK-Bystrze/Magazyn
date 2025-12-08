package service_test

import (
	"context"
	"errors"
	"testing"

	"magazyn/backend/internal/service"
	"magazyn/backend/internal/testutils/mocks"
	"magazyn/backend/internal/types"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	gotrueTypes "github.com/supabase-community/gotrue-go/types"
)

func TestAuthService_Login(t *testing.T) {
	t.Run("successful login sends OTP", func(t *testing.T) {
		mockAuth := new(mocks.MockAuthClient)
		mockDB := new(mocks.MockPostgrestClient) // Not used in Login
		
		s := service.NewAuthService(mockAuth, mockDB)
		
		email := "test@example.com"
		mockAuth.On("OTP", gotrueTypes.OTPRequest{
			Email:      email,
			CreateUser: true,
		}).Return(nil)
		
		err := s.Login(email)
		
		assert.NoError(t, err)
		mockAuth.AssertExpectations(t)
	})
	
	t.Run("returns error when OTP fails", func(t *testing.T) {
		mockAuth := new(mocks.MockAuthClient)
		mockDB := new(mocks.MockPostgrestClient)
		
		s := service.NewAuthService(mockAuth, mockDB)
		
		email := "fail@example.com"
		expectedErr := errors.New("otp failed")
		mockAuth.On("OTP", mock.Anything).Return(expectedErr)
		
		err := s.Login(email)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to send magic link")
		mockAuth.AssertExpectations(t)
	})
}

func TestAuthService_Logout(t *testing.T) {
	t.Run("successful logout", func(t *testing.T) {
		mockAuth := new(mocks.MockAuthClient)
		mockAuthWithToken := new(mocks.MockAuthClientWithToken)
		mockDB := new(mocks.MockPostgrestClient)
		
		s := service.NewAuthService(mockAuth, mockDB)
		
		token := "valid.token"
		mockAuth.On("WithToken", token).Return(mockAuthWithToken)
		mockAuthWithToken.On("Logout").Return(nil)
		
		err := s.Logout(context.Background(), token)
		
		assert.NoError(t, err)
		mockAuth.AssertExpectations(t)
		mockAuthWithToken.AssertExpectations(t)
	})
	
	t.Run("returns error when logout fails", func(t *testing.T) {
		mockAuth := new(mocks.MockAuthClient)
		mockAuthWithToken := new(mocks.MockAuthClientWithToken)
		mockDB := new(mocks.MockPostgrestClient)
		
		s := service.NewAuthService(mockAuth, mockDB)
		
		token := "invalid.token"
		expectedErr := errors.New("logout failed")
		mockAuth.On("WithToken", token).Return(mockAuthWithToken)
		mockAuthWithToken.On("Logout").Return(expectedErr)
		
		err := s.Logout(context.Background(), token)
		
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "failed to logout")
	})
}

func TestAuthService_GetSession(t *testing.T) {
	t.Run("successful session retrieval", func(t *testing.T) {
		mockAuth := new(mocks.MockAuthClient)
		mockDB := new(mocks.MockPostgrestClient)
		mockQuery := new(mocks.MockPostgrestQueryBuilder)
		mockFilter := new(mocks.MockPostgrestFilterBuilder)
		
		s := service.NewAuthService(mockAuth, mockDB)
		
		userId := uuid.New().String()
		
		// Setup chain
		mockDB.On("From", "profiles").Return(mockQuery)
		mockQuery.On("Select", "*", "exact", false).Return(mockFilter)
		mockFilter.On("Eq", "id", userId).Return(mockFilter)
		
		// Setup ExecuteTo to populate response
		mockFilter.On("ExecuteTo", mock.Anything).Run(func(args mock.Arguments) {
			dest := args.Get(0)
			// Assuming dest is *[]model.PublicProfilesSelect
			if profiles, ok := dest.(*[]types.PublicProfilesSelect); ok {
				*profiles = []types.PublicProfilesSelect{
					{
						Id:            userId,
						Email:         "user@example.com",
						Username:      "testuser",
						Role:          "user",
						IsEnabled:     true,
						CreditBalance: 100,
					},
				}
			}
		}).Return("", nil)
		
		session, err := s.GetSession(context.Background(), userId)
		
		assert.NoError(t, err)
		assert.NotNil(t, session)
		assert.Equal(t, userId, session.UserId)
		assert.Equal(t, "user@example.com", session.Email)
		assert.Equal(t, "testuser", session.Username)
		
		mockDB.AssertExpectations(t)
	})
	
	t.Run("profile not found", func(t *testing.T) {
		mockAuth := new(mocks.MockAuthClient)
		mockDB := new(mocks.MockPostgrestClient)
		mockQuery := new(mocks.MockPostgrestQueryBuilder)
		mockFilter := new(mocks.MockPostgrestFilterBuilder)
		
		s := service.NewAuthService(mockAuth, mockDB)
		
		userId := uuid.New().String()
		
		// Setup chain
		mockDB.On("From", "profiles").Return(mockQuery)
		mockQuery.On("Select", "*", "exact", false).Return(mockFilter)
		mockFilter.On("Eq", "id", userId).Return(mockFilter)
		
		// Return empty list
		mockFilter.On("ExecuteTo", mock.Anything).Run(func(args mock.Arguments) {
			dest := args.Get(0)
			if profiles, ok := dest.(*[]types.PublicProfilesSelect); ok {
				*profiles = []types.PublicProfilesSelect{}
			}
		}).Return("", nil)
		
		session, err := s.GetSession(context.Background(), userId)
		
		assert.Error(t, err)
		assert.Nil(t, session)
		assert.Equal(t, "profile not found", err.Error())
	})
	
	t.Run("database error", func(t *testing.T) {
		mockAuth := new(mocks.MockAuthClient)
		mockDB := new(mocks.MockPostgrestClient)
		mockQuery := new(mocks.MockPostgrestQueryBuilder)
		mockFilter := new(mocks.MockPostgrestFilterBuilder)
		
		s := service.NewAuthService(mockAuth, mockDB)
		
		userId := uuid.New().String()
		expectedErr := errors.New("db connection failed")
		
		mockDB.On("From", "profiles").Return(mockQuery)
		mockQuery.On("Select", "*", "exact", false).Return(mockFilter)
		mockFilter.On("Eq", "id", userId).Return(mockFilter)
		mockFilter.On("ExecuteTo", mock.Anything).Return("", expectedErr)
		
		session, err := s.GetSession(context.Background(), userId)
		
		assert.Error(t, err)
		assert.Nil(t, session)
		assert.Contains(t, err.Error(), "failed to fetch profile")
	})
}
