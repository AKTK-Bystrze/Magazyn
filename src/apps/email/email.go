package email

import (
	"bystrze/apps"
	"bystrze/apps/email/appState"
	"bystrze/apps/email/service"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

func CreateEmailApp(db apps.Database, store sessions.Store, debug bool,
	server string, appName string, router *mux.Router,
	MAGAZYN_BYSTRZE_EMAIL_ADDR, SMTP_HOST string, SMTP_PORT string) apps.App {
	appState.App = apps.App{
		Db:      db,
		Store:   store,
		Server:  server,
		AppName: appName,
		Router:  router,
	}
	appState.DEBUG = debug
	appState.App.SetLogger()
	appState.App.LoadTemplates()

	appState.MAGAZYN_BYSTRZE_EMAIL_ADDR = MAGAZYN_BYSTRZE_EMAIL_ADDR
	appState.MAGAZYN_BYSTRZE_EMAIL_LOGIN = service.GetEmailUsername(MAGAZYN_BYSTRZE_EMAIL_ADDR)
	appState.SMTP_HOST = SMTP_HOST
	appState.SMTP_PORT = SMTP_PORT
	appState.RESERVATION_NOTIFICATION_INTERVAL = time.Duration(30) * time.Minute
	appState.Last_reservation_notification = time.Now().Add(-2 * appState.RESERVATION_NOTIFICATION_INTERVAL)

	return appState.App
}