package pages

import (
	"bystrze/apps"
	"bystrze/apps/pages/appState"
	"bystrze/apps/pages/home"
	"bystrze/apps/pages/news"
	"bystrze/apps/userManager/auth/access"
	"html/template"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

func CreatePagesApp(db apps.Database, funcMap template.FuncMap, store sessions.Store,
	t apps.Templates, server string, appName string, router *mux.Router) apps.App {
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
	pagesRouter := router.PathPrefix("/pages").Subrouter()
	pagesRouter.Use(access.NinjaHandler)
	pagesRouter.HandleFunc("/news", news.CreateNewsHandler).Methods("POST")
	pagesRouter.HandleFunc("/news/{newsId}", news.DeleteNewsHandler).Methods("DELETE")
	return router
}
