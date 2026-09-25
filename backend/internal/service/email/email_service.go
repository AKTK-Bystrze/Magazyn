package email

import (
	"context"
	"magazyn/backend/internal/logger"
)

type Service interface {
	SendReservationConfirmation(ctx context.Context, email string, details map[string]interface{}) error
}
type noopEmailService struct{}

func NewNoopEmailService() Service {
	return &noopEmailService{}
}
func (s *noopEmailService) SendReservationConfirmation(ctx context.Context, email string, details map[string]interface{}) error {
	logger.Infof(ctx, "Mock sending email to %s: %v", email, details)
	return nil
}
