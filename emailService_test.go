package main

import (
	"testing"
)

func TestEmailService(t *testing.T) {
	receiver := User{
		ID:    1,
		Name:  "Name",
		Email: MAGAZYN_BYSTRZE_EMAIL,
	}
	result := SendEmail(receiver, "Subject", "This is a test message, please ignore.")
	if result != nil {
		t.Errorf("Can't send test email, error: %s", result)
	}
}
