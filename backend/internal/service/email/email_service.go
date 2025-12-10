package email

import (
	"context"
	"magazyn/backend/internal/logger"
)

// EmailService defines operations for sending emails
type EmailService interface {
	SendReservationConfirmation(ctx context.Context, email string, details map[string]interface{}) error
}

type noopEmailService struct{}

// NewNoopEmailService creates a dummy email service that does nothing (for now)
func NewNoopEmailService() EmailService {
	return &noopEmailService{}
}

func (s *noopEmailService) SendReservationConfirmation(ctx context.Context, email string, details map[string]interface{}) error {
	logger.Infof(ctx, "Mock sending email to %s: %v", email, details)
	return nil
}
