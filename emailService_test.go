package main

import (
	"testing"
)

func TestEmailService(t *testing.T) {
	t.Skip("SKIP TEST")
	receiver := User{
		ID:    1,
		Name:  "Name",
		Email: MAGAZYN_BYSTRZE_EMAIL_ADDR,
	}
	result := SendEmail(receiver, "Test email", "This is a test message, please ignore.")
	if result != nil {
		t.Errorf("Can't send test email, error: %s", result)
	}
}
