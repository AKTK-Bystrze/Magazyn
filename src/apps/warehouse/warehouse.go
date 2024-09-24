package warehouse

import (
	"bystrze/apps"
	"bystrze/apps/pages/appState"
	"bystrze/apps/pages/home"
	"bystrze/services/utils"
	"html/template"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

func CreateWarehouseApp(db utils.Database, funcMap template.FuncMap, store sessions.Store,
	t utils.Templates, server string, appName string, router *mux.Router) apps.App {
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
	return appState.App
}

func updateRouter(router *mux.Router) *mux.Router {
	router.HandleFunc("/", home.HomePage).Methods("GET")
	return router
}
