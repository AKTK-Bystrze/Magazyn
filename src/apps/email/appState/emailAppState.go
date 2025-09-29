package appState

import "bystrze/apps"

const (
	APP_NAME = "E-magazyn Bystrze"
)

var (
	App                         apps.App
	MAGAZYN_BYSTRZE_EMAIL_ADDR  string
	MAGAZYN_BYSTRZE_EMAIL_LOGIN string
	SMTP_HOST                   string
	SMTP_PORT                   string
	DEBUG                   bool
)
