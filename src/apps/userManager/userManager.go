package userManager

import (
	"bystrze/apps"
	"bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/auth"
	"bystrze/apps/userManager/auth/access"
	"bystrze/apps/userManager/controllers"
	"html/template"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/johnsto/go-passwordless/v2"
)

func CreateUserManagerApp(db apps.Database, funcMap template.FuncMap, store sessions.Store,
	t apps.Templates, server string, appName string, router *mux.Router, COOKIE_KEY []byte) apps.App {
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
	appState.COOKIE_KEY = COOKIE_KEY
	tokStore := passwordless.NewMemStore()
	appState.Pw = passwordless.New(tokStore)

	auth.SetTokenTransportMean()

	return appState.App
}

func updateRouter(router *mux.Router) *mux.Router {
	router.HandleFunc("/login", controllers.Login).Methods("GET")
	router.HandleFunc("/token", auth.TokenHandler).Methods("POST", "GET")

	//users privilige
	usersRouter := router.PathPrefix("/users").Subrouter()
	usersRouter.Use(access.ValidUserMiddlware)
	userRouter := usersRouter.PathPrefix("/user").Subrouter()
	userRouter.HandleFunc("/logout", controllers.Logout).Methods("GET")
	userRouter.HandleFunc("/dashboard", controllers.UserDashboard).Methods("GET")

	//admin privilige
	adminRouter := usersRouter.PathPrefix("/admin").Subrouter()
	adminRouter.Use(access.AdminHandler)
	adminRouter.HandleFunc("/user/show", controllers.AdminShowUserHandler).Methods("GET")

	// superAdmin privilige
	superAdminRouter := usersRouter.PathPrefix("/superAdmin").Subrouter()
	// superAdminRouter.Use(access.ValidUserMiddlware) //tood???
	superAdminRouter.Use(access.SuperAdminHandler)
	//  superAdmin
	superAdminRouter.HandleFunc("/users", controllers.UpdateUser).Methods("PUT")
	superAdminRouter.HandleFunc("/users", controllers.GetUsersController).Methods("GET")

	return router
}
