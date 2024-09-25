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
	//rental
	rentalRouter := router.PathPrefix("/rental").Subrouter()
	rentalRouter.Use(access.ValidUserMiddlware)
	//rental user
	rentalUserRouter := rentalRouter.PathPrefix("/user").Subrouter()
	rentalUserRouter.HandleFunc("/search", items.SearchHandler).Methods("GET", "POST")
	rentalUserRouter.HandleFunc("/reserve", items.ReserveItem).Methods("POST")
	//rental admin
	rentalAdminRouter := rentalRouter.PathPrefix("/admin").Subrouter()
	rentalAdminRouter.Use(access.AdminHandler)
	rentalAdminRouter.HandleFunc("/reservations", controllers.AdminDashboardHandler).Methods("GET")
	rentalAdminRouter.HandleFunc("/setStatus", rental.SetStatusHandler).Methods("PUT")
	rentalAdminRouter.HandleFunc("/reservation/show", rental.ReservationHandler).Methods("GET")
	//items admin
	itemRouter := router.PathPrefix("/items").Subrouter()
	itemRouter.Use(access.ValidUserMiddlware) //todo ??
	itemRouter.Use(access.AdminHandler)
	itemRouter.HandleFunc("/admin", controllers.AdminItemsHandler).Methods("GET") //todo refactor controlles package from usersManager here?
	itemRouter.HandleFunc("/admin/item/status", controllers.AdminItemStatusHandler).Methods("POST")
	itemRouter.HandleFunc("/admin/item/show", controllers.AdminShowItemHandler).Methods("GET")

	//inventory
	inventoryRouter := router.PathPrefix("/inventory").Subrouter()
	inventoryRouter.Use(access.ValidUserMiddlware) //todo??
	inventoryRouter.Use(access.AdminHandler)
	inventoryRouter.HandleFunc("/admin", inventory.Inventory).Methods("GET") //todo?? will it work

	return router
}
