package warehouse

import (
	"bystrze/apps"
	"bystrze/apps/pages/appState"
	"bystrze/apps/userManager/auth/access"
	"bystrze/apps/userManager/controllers"
	"bystrze/apps/warehouse/inventory"
	"bystrze/apps/warehouse/items"
	"bystrze/apps/warehouse/rental"
	"html/template"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
)

func CreateWarehouseApp(db apps.Database, funcMap template.FuncMap, store sessions.Store,
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
	//items user
	rentalUserRouter := router.PathPrefix("/rental").Subrouter()
	rentalUserRouter.HandleFunc("/search", items.SearchHandler).Methods("GET", "POST")
	rentalUserRouter.HandleFunc("/reserve", items.ReserveItem).Methods("POST")
	//items Admin
	itemRouter := router.PathPrefix("/items").Subrouter()
	itemRouter.Use(access.AdminHandler)
	itemRouter.HandleFunc("/", controllers.AdminItemsHandler).Methods("GET") //todo refactor controlles package from usersManager here?
	itemRouter.HandleFunc("/item/status", controllers.AdminItemStatusHandler).Methods("POST")
	itemRouter.HandleFunc("/item/show", controllers.AdminShowItemHandler).Methods("GET")
	//rental admin
	rentalAdminRouter := rentalUserRouter.PathPrefix("/admin").Subrouter()
	rentalAdminRouter.Use(access.AdminHandler)
	rentalAdminRouter.HandleFunc("/reservations", controllers.AdminDashboardHandler).Methods("GET")
	rentalAdminRouter.HandleFunc("/setStatus", rental.SetStatusHandler).Methods("PUT")
	rentalAdminRouter.HandleFunc("/reservation/show", rental.ReservationHandler).Methods("GET")
	//inventory
	inventoryRouter := router.PathPrefix("/inventory").Subrouter()
	inventoryRouter.Use(access.AdminHandler)
	inventoryRouter.HandleFunc("/", inventory.Inventory).Methods("GET")

	return router
}
