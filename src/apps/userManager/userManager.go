package userManager

import (
	"bystrze/apps"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/auth"
	"bystrze/services/utils"
	"html/template"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/johnsto/go-passwordless/v2"
)

func CreateUserManagerApp(db utils.Database, funcMap template.FuncMap, store sessions.Store,
	t utils.Templates, server string, appName string, router *mux.Router, COOKIE_KEY []byte) apps.App {
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

	auth.ValidateCOOKIE_KEY()
	appState.App.Store = sessions.NewCookieStore(COOKIE_KEY)
	appState.COOKIE_KEY = COOKIE_KEY
	tokStore := passwordless.NewMemStore()
	appState.Pw = passwordless.New(tokStore)

	auth.SetTokenTransportMean()

	return appState.App
}

func updateRouter(router *mux.Router) *mux.Router {

	return router
}
