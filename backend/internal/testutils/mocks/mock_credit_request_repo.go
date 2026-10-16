package mocks

import (
	"context"

	"magazyn/backend/internal/repository"
	"magazyn/backend/internal/types"
)

// MockCreditRequestRepository is an in-memory mock repository for credit requests.
type MockCreditRequestRepository struct {
	Data map[string]*types.CreditRequestDTO
}

// NewMockCreditRequestRepository initializes a new MockCreditRequestRepository.
func NewMockCreditRequestRepository() *MockCreditRequestRepository {
	return &MockCreditRequestRepository{
		Data: make(map[string]*types.CreditRequestDTO),
	}
}

func (m *MockCreditRequestRepository) ListRequests(ctx context.Context, page, perPage int) ([]types.CreditRequestDTO, int64, error) {
	return nil, 0, nil
}

func (m *MockCreditRequestRepository) GetByID(ctx context.Context, id string) (*types.CreditRequestDTO, error) {
	if item, ok := m.Data[id]; ok {
		return item, nil
	}
	return nil, types.NewNotFoundError("CreditRequest", id)
}

func (m *MockCreditRequestRepository) Create(ctx context.Context, req types.CreditRequestDTO) (*types.CreditRequestDTO, error) {
	req.ID = "new-id"
	m.Data["new-id"] = &req
	return &req, nil
}

func (m *MockCreditRequestRepository) Update(ctx context.Context, id string, req types.CreditRequestDTO) (*types.CreditRequestDTO, error) {
	m.Data[id] = &req
	return &req, nil
}

func (m *MockCreditRequestRepository) ReviewAtomic(ctx context.Context, id string, adminID string, status types.CreditRequestStatus, creditsValue *int32, helpers []string, reason string, description string) error {
	if item, ok := m.Data[id]; ok {
		item.Status = status
		if creditsValue != nil {
			item.CreditsValue = *creditsValue
		}
		if helpers != nil {
			item.Helpers = helpers
		}
	}
	return nil
}

func (m *MockCreditRequestRepository) GetLeaderboard(ctx context.Context) ([]types.UserCreditLeaderboardItem, error) {
	return nil, nil
}

var _ repository.CreditRequestRepository = (*MockCreditRequestRepository)(nil)
