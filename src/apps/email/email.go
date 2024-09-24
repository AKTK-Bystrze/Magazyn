package email

import (
	"bystrze/apps"
	"bystrze/apps/email/appState"
	"bystrze/services/utils"
	"html/template"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

func CreateEmailApp(db utils.Database, funcMap template.FuncMap, store sessions.Store,
	t utils.Templates, server string, appName string, router *mux.Router,
	MAGAZYN_BYSTRZE_EMAIL_ADDR, string, MAGAZYN_BYSTRZE_EMAIL_LOGIN string, SMTP_HOST string, SMTP_PORT string) apps.App {
	appState.App = apps.App{
		Db:        db,
		FuncMap:   funcMap,
		Store:     store,
		Server:    server,
		AppName:   appName,
		Router:    router,
		Templates: t,
	}
	appState.App.SetLogger()
	appState.App.LoadTemplates()
	appState.App.Router = updateRouter(appState.App.Router)

	appState.MAGAZYN_BYSTRZE_EMAIL_ADDR = MAGAZYN_BYSTRZE_EMAIL_ADDR
	appState.MAGAZYN_BYSTRZE_EMAIL_LOGIN = MAGAZYN_BYSTRZE_EMAIL_LOGIN
	appState.SMTP_HOST = SMTP_HOST
	appState.SMTP_PORT = SMTP_PORT

	return appState.App
}

func updateRouter(router *mux.Router) *mux.Router {
	return router
}
