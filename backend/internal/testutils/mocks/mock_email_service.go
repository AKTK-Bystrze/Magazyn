package mocks

import (
	"context"

	"magazyn/backend/internal/service/email"

	"github.com/stretchr/testify/mock"
)

// MockEmailService implements email.EmailService
type MockEmailService struct {
	mock.Mock
}

// Ensure mock implements interface
var _ email.EmailService = (*MockEmailService)(nil)

func (m *MockEmailService) SendReservationConfirmation(ctx context.Context, emailAddr string, details map[string]interface{}) error {
	args := m.Called(ctx, emailAddr, details)
	return args.Error(0)
}
