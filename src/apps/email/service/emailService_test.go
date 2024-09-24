package service

import (
	"bystrze/apps/email/appState"
	"bystrze/services/structs"
	"testing"
)

func TestEmailService(t *testing.T) {
	t.Skip("SKIP TEST")
	receiver := structs.User{
		ID:    1,
		Name:  "Name",
		Email: appState.MAGAZYN_BYSTRZE_EMAIL_ADDR,
	}
	result := SendEmail(receiver, "Test email", "This is a test message, please ignore.")
	if result != nil {
		t.Errorf("Can't send test email, error: %s", result)
	}
}
