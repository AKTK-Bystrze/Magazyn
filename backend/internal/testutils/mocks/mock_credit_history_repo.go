package mocks

import (
	"context"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/mock"
)

// MockCreditHistoryRepository implements repository.CreditHistoryRepository
type MockCreditHistoryRepository struct {
	mock.Mock
}

// Ensure mock implements interface
var _ repository.CreditHistoryRepository = (*MockCreditHistoryRepository)(nil)

func (m *MockCreditHistoryRepository) GetCreditHistory(ctx context.Context, userID *string, page, perPage int) ([]types.CreditHistoryItemDTO, int64, error) {
	args := m.Called(ctx, userID, page, perPage)
	if args.Get(0) == nil {
		return nil, args.Get(1).(int64), args.Error(2)
	}
	return args.Get(0).([]types.CreditHistoryItemDTO), args.Get(1).(int64), args.Error(2)
}

func (m *MockCreditHistoryRepository) Create(ctx context.Context, item types.PublicCreditHistoryInsert) error {
	args := m.Called(ctx, item)
	return args.Error(0)
}
