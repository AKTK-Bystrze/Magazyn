// Package email provides email sending functionality.
package email

import (
	"context"

	"magazyn/backend/internal/logger"
)

// Service defines operations for sending emails
type Service interface {
	SendReservationConfirmation(ctx context.Context, email string, details map[string]interface{}) error
}

type noopEmailService struct{}

// NewNoopEmailService creates a dummy email service that does nothing (for now)
func NewNoopEmailService() Service {
	return &noopEmailService{}
}

func (s *noopEmailService) SendReservationConfirmation(ctx context.Context, email string, details map[string]interface{}) error {
	logger.Infof(ctx, "Mock sending email to %s: %v", email, details)
	return nil
}
