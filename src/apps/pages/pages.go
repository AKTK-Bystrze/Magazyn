package pages

import (
	"bystrze/apps"
	"bystrze/apps/pages/appState"
	"bystrze/apps/pages/home"
	"bystrze/apps/pages/news"
	"bystrze/apps/userManager/auth/access"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

func CreatePagesApp(db apps.Database, dbPath string, dbName string, store sessions.Store,
	server string, appName string, router *mux.Router) apps.App {
	appState.App = apps.App{
		Db:      db,
		DbPath:  dbPath,
		DbName:  dbName,
		Store:   store,
		Server:  server,
		AppName: appName,
		Router:  router,
	}
	appState.App.SetLogger()
	appState.App.LoadTemplates()
	appState.App.Router = updateRouter(appState.App.Router)
	return appState.App
}

func updateRouter(router *mux.Router) *mux.Router {
	//all
	router.HandleFunc("/", redirectToHome).Methods("GET")
	pagesRouter := router.PathPrefix("/pages").Subrouter()
	pagesRouter.Use(access.ValidUserMiddlware)
	pagesRouter.HandleFunc("/home", home.HomePage).Methods("GET")
	//ninja
	ninjaRouter := pagesRouter.PathPrefix("/ninja").Subrouter()
	ninjaRouter.Use(access.NinjaHandler)
	ninjaRouter.HandleFunc("/news", news.CreateNewsHandler).Methods("POST")
	ninjaRouter.HandleFunc("/news/{newsId}", news.DeleteNewsHandler).Methods("DELETE")
	//superAdmin
	superAdminRouter := pagesRouter.PathPrefix("/superAdmin").Subrouter()
	superAdminRouter.Use(access.SuperAdminHandler)
	superAdminRouter.HandleFunc("/db/backup", appState.App.DbBackupHandler).Methods("GET")
	return router
}

func redirectToHome(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/pages/home", http.StatusTemporaryRedirect)
}
