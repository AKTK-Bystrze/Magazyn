package warehouse

import (
	"bystrze/apps"
	"bystrze/apps/userManager/auth/access"
	"bystrze/apps/userManager/controllers"
	"bystrze/apps/warehouse/appState"
	"bystrze/apps/warehouse/inventory"
	"bystrze/apps/warehouse/items"
	"bystrze/apps/warehouse/rental"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

func CreateWarehouseApp(db apps.Database, dbPath string, dbName string, store sessions.Store,
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
	warehouseRouter := router.PathPrefix("/warehouse").Subrouter()
	warehouseRouter.Use(access.ValidUserMiddlware)
	// user
	userRouter := warehouseRouter.PathPrefix("/user").Subrouter()
	userRouter.HandleFunc("/search", items.SearchHandler).Methods("GET", "POST")
	userRouter.HandleFunc("/reserve", items.ReserveItem).Methods("POST")
	// admin
	adminRouter := warehouseRouter.PathPrefix("/admin").Subrouter()
	adminRouter.Use(access.AdminHandler)
	adminRouter.HandleFunc("/reservations", controllers.AdminDashboardHandler).Methods("GET")
	adminRouter.HandleFunc("/setStatus", rental.SetStatusHandler).Methods("PUT")
	adminRouter.HandleFunc("/reservation/show", rental.ReservationHandler).Methods("GET")
	adminRouter.HandleFunc("/inventory", inventory.Inventory).Methods("GET")
	adminRouter.HandleFunc("/db/backup", appState.App.DbBackupHandler).Methods("Get")
	adminRouter.HandleFunc("/items", controllers.AdminItemsHandler).Methods("GET")
	//item admin
	adminItemRouter := adminRouter.PathPrefix("/item").Subrouter()
	adminItemRouter.HandleFunc("/status", controllers.AdminItemStatusHandler).Methods("POST")
	adminItemRouter.HandleFunc("/show", controllers.AdminShowItemHandler).Methods("GET")
	//superAdmin
	superAdminRouter := warehouseRouter.PathPrefix("/superAdmin").Subrouter()
	superAdminRouter.Use(access.SuperAdminHandler)
	superAdminRouter.HandleFunc("/db/backup", appState.App.DbBackupHandler).Methods("Get")

	return router
}
