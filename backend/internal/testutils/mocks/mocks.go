package mocks

import (
	"context"
	"magazyn/backend/internal/service"

	"github.com/stretchr/testify/mock"
	"github.com/supabase-community/gotrue-go/types"
)

// MockAuthClient mocks service.AuthClient
type MockAuthClient struct {
	mock.Mock
}

func (m *MockAuthClient) OTP(req types.OTPRequest) error {
	args := m.Called(req)
	return args.Error(0)
}

func (m *MockAuthClient) WithToken(token string) service.AuthClientWithToken {
	args := m.Called(token)
	return args.Get(0).(service.AuthClientWithToken)
}

// MockAuthClientWithToken mocks service.AuthClientWithToken
type MockAuthClientWithToken struct {
	mock.Mock
}

func (m *MockAuthClientWithToken) Logout() error {
	args := m.Called()
	return args.Error(0)
}

func (m *MockAuthClientWithToken) GetUser() (*types.User, error) {
	args := m.Called()
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.User), args.Error(1)
}

// MockPostgrestClient mocks service.PostgrestClient
type MockPostgrestClient struct {
	mock.Mock
}

func (m *MockPostgrestClient) From(table string) service.PostgrestQueryBuilder {
	args := m.Called(table)
	return args.Get(0).(service.PostgrestQueryBuilder)
}

// MockPostgrestQueryBuilder mocks service.PostgrestQueryBuilder
type MockPostgrestQueryBuilder struct {
	mock.Mock
}

func (m *MockPostgrestQueryBuilder) Select(columns string, count string, head bool) service.PostgrestFilterBuilder {
	args := m.Called(columns, count, head)
	return args.Get(0).(service.PostgrestFilterBuilder)
}

// MockPostgrestFilterBuilder mocks service.PostgrestFilterBuilder
type MockPostgrestFilterBuilder struct {
	mock.Mock
}

func (m *MockPostgrestFilterBuilder) Eq(column string, value string) service.PostgrestFilterBuilder {
	args := m.Called(column, value)
	return args.Get(0).(service.PostgrestFilterBuilder)
}

func (m *MockPostgrestFilterBuilder) ExecuteTo(dest interface{}) (string, error) {
	args := m.Called(dest)
	return args.String(0), args.Error(1)
}

// Helper to set up ExecuteTo to populate destination
func (m *MockPostgrestFilterBuilder) ReturnData(data interface{}) *mock.Call {
	// This is a bit tricky with testify.
	// We usually use Run() to modify arguments.
	// But ExecuteTo takes a pointer.
	// Standard usage in tests:
	// mockBuilder.On("ExecuteTo", mock.Anything).Run(func(args mock.Arguments) {
	//    dest := args.Get(0)
	//    // reflect copy from data to dest
	// }).Return("", nil)
	return m.On("ExecuteTo", mock.Anything)
}


// MockAuthService mocks service.AuthServiceInterface
type MockAuthService struct {
	mock.Mock
}

func (m *MockAuthService) Login(ctx context.Context, email string) error {
	args := m.Called(ctx, email)
	return args.Error(0)
}

func (m *MockAuthService) Logout(ctx context.Context, token string) error {
	args := m.Called(ctx, token)
	return args.Error(0)
}

func (m *MockAuthService) GetSession(ctx context.Context, userId string) (*service.SessionResponse, error) {
	args := m.Called(ctx, userId)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*service.SessionResponse), args.Error(1)
}
