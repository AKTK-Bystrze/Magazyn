package mocks

import (
	"context"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockCreditHistoryService is a mock implementation of credit.CreditHistoryService.
type MockCreditHistoryService struct {
	mock.Mock
}

func (m *MockCreditHistoryService) GetCreditHistory(ctx context.Context, query types.GetCreditHistoryQuery, requestingUserID string, userRole string) (*types.CreditHistoryResponse, error) {
	args := m.Called(ctx, query, requestingUserID, userRole)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*types.CreditHistoryResponse), args.Error(1)
}
