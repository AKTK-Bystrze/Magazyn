package warehouse

import (
	"bystrze/apps"
	"bystrze/apps/userManager/auth/access"
	"bystrze/apps/warehouse/appState"
	"bystrze/apps/warehouse/controllers"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

func CreateWarehouseApp(db apps.Database, store sessions.Store,
	server string, appName string, router *mux.Router) apps.App {
	appState.App = apps.App{
		Db:      db,
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
	warehouseRouter := router.PathPrefix("/warehouse").Subrouter()
	warehouseRouter.Use(access.ValidUserMiddlware)
	// user
	userRouter := warehouseRouter.PathPrefix("/user").Subrouter()
	userRouter.HandleFunc("/search", controllers.SearchHandler).Methods("GET", "POST")
	userRouter.HandleFunc("/reserve", controllers.ReserveItem).Methods("POST")
	// admin
	adminRouter := warehouseRouter.PathPrefix("/admin").Subrouter()
	adminRouter.Use(access.AdminHandler)
	adminRouter.HandleFunc("/reservations", controllers.AdminDashboardHandler).Methods("GET")
	adminRouter.HandleFunc("/setStatus", controllers.SetStatusHandler).Methods("PUT")
	adminRouter.HandleFunc("/reservation/show", controllers.ReservationHandler).Methods("GET")
	adminRouter.HandleFunc("/inventory", controllers.Inventory).Methods("GET")
	adminRouter.HandleFunc("/items", controllers.AdminItemsHandler).Methods("GET")
	//item admin
	adminItemRouter := adminRouter.PathPrefix("/item").Subrouter()
	adminItemRouter.HandleFunc("/status", controllers.AdminItemStatusHandler).Methods("POST")
	adminItemRouter.HandleFunc("/description", controllers.AdminItemStatusEdit).Methods("POST")
	adminItemRouter.HandleFunc("/show", controllers.AdminShowItemHandler).Methods("GET")

	return router
}
