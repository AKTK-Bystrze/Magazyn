package main

import (
	"bystrze/apps/pages"
	"bystrze/apps/pages/home"
	"bystrze/services/structs"
	"bystrze/services/utils"
	"context"
	"errors"
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strings"
	"time"

	"path/filepath"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
	"github.com/johnsto/go-passwordless/v2"
	_ "github.com/mattn/go-sqlite3"
)

var (
	pw                          utils.Passwordless
	COOKIE_KEY                  = []byte(os.Getenv("COOKIE_KEY"))
	app                         AppState
	tmpl                        *template.Template
	MAGAZYN_BYSTRZE_EMAIL_ADDR  = os.Getenv("MAGAZYN_BYSTRZE_EMAIL_ADDR")
	MAGAZYN_BYSTRZE_EMAIL_LOGIN = utils.GetEmailUsername(MAGAZYN_BYSTRZE_EMAIL_ADDR)
	SMTP_HOST                   = os.Getenv("SMTP_HOST")
	SMTP_PORT                   = os.Getenv("SMTP_PORT")
)

func getFuncMap() template.FuncMap {
	funcMap := template.FuncMap{
		"Now": time.Now,
		"Before": func(t1, t2 time.Time) bool {
			return t1.Before(t2)
		},
		"After": func(t1, t2 time.Time) bool {
			return t1.After(t2)
		},
		"AddHours": func(t time.Time, d int) time.Time {
			return t.Add(time.Duration(d) * time.Hour)
		},
		"dict": func(values ...interface{}) (map[string]interface{}, error) {
			if len(values)%2 != 0 {
				return nil, errors.New("invalid dict call")
			}
			dict := make(map[string]interface{}, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil, errors.New("dict keys must be strings")
				}
				dict[key] = values[i+1]
			}
			return dict, nil
		},
		"contains": func(substring, str string) bool {
			return strings.Contains(str, substring)
		},
	}
	return funcMap
}

func loadTemplates() {

	funcMap := template.FuncMap{
		"Now": time.Now,
		"Before": func(t1, t2 time.Time) bool {
			return t1.Before(t2)
		},
		"After": func(t1, t2 time.Time) bool {
			return t1.After(t2)
		},
		"AddHours": func(t time.Time, d int) time.Time {
			return t.Add(time.Duration(d) * time.Hour)
		},
		"dict": func(values ...interface{}) (map[string]interface{}, error) {
			if len(values)%2 != 0 {
				return nil, errors.New("invalid dict call")
			}
			dict := make(map[string]interface{}, len(values)/2)
			for i := 0; i < len(values); i += 2 {
				key, ok := values[i].(string)
				if !ok {
					return nil, errors.New("dict keys must be strings")
				}
				dict[key] = values[i+1]
			}
			return dict, nil
		},
		"contains": func(substring, str string) bool {
			return strings.Contains(str, substring)
		},
	}
	patterns := []string{
		"templates/*.html",
		"templates/*/*.html",
	}
	files := []string{}
	for _, dir := range patterns {
		ff, err := filepath.Glob(dir)
		if err != nil {
			panic(err)
		}
		files = append(files, ff...)
	}
	var err error
	app.templates, err = template.New("").Funcs(funcMap).ParseFiles(files...)
	if err != nil {
		app.Fatal("Error parsing templates: %v", err)
	}
}

//  TODO: this is unused, left as a reminder how to build wrappers for handler
/*
func loggedUserHandler(h func(http.ResponseWriter, *http.Request)) func(w http.ResponseWriter, r *http.Request) {
  return func(w http.ResponseWriter, r *http.Request) {
    if app.checkLoggedIn(w, r) {
      h(w, r)
    }
  }
}
*/

func main() {
	if len(os.Args) != 4 {
		fmt.Fprintf(os.Stderr, "Usage: %s IP PORT DOMAIN\n", os.Args[0])
		os.Exit(1)
	}

	addr := fmt.Sprintf("%s:%s", os.Args[1], os.Args[2])

	db, err := sqlx.Open("sqlite3", structs.DATABASE_NAME)
	if err != nil {
		app.Fatal(err)
	}
	defer db.Close()
	app.db = db
	app.server = os.Args[3]

	loadTemplates()

	router := mux.NewRouter()
	router.HandleFunc("/login", Login).Methods("GET")
	router.HandleFunc("/token", TokenHandler).Methods("POST", "GET")
	userRouter := mux.NewRouter()
	userRouter.Use(validUserMiddlware)

	adminRouter := userRouter.PathPrefix("/admin").Subrouter()
	//  every logged-in user
	userRouter.HandleFunc("/dashboard", UserDashboard).Methods("GET")
	userRouter.HandleFunc("/search", SearchHandler).Methods("GET", "POST")
	userRouter.HandleFunc("/logout", Logout).Methods("GET")
	userRouter.HandleFunc("/reserve", ReserveItem).Methods("POST")

	//  enforce users with admin role
	adminRouter.Use(adminHandler)
	//  admin
	adminRouter.HandleFunc("/reservations", AdminDashboardHandler).Methods("GET")
	adminRouter.HandleFunc("/setStatus", SetStatusHandler).Methods("PUT")
	adminRouter.HandleFunc("/items", AdminItemsHandler).Methods("GET")
	adminRouter.HandleFunc("/item/status", AdminItemStatusHandler).Methods("POST")
	adminRouter.HandleFunc("/item/show", AdminShowItemHandler).Methods("GET")
	adminRouter.HandleFunc("/user/show", AdminShowUserHandler).Methods("GET")
	adminRouter.HandleFunc("/reservation/show", ReservationHandler).Methods("GET")
	adminRouter.HandleFunc("/db/backup", DbBackupHandler).Methods("GET")
	adminRouter.HandleFunc("/inventory", Inventory).Methods("GET")

	//  enforce users with ninja role
	ninjaRouter := userRouter.PathPrefix("/ninja").Subrouter()
	ninjaRouter.Use(ninjaHandler)

	//  enforce users with superAdmin role
	superAdminRouter := userRouter.PathPrefix("/superAdmin").Subrouter()
	superAdminRouter.Use(superAdminHandler)
	//  superAdmin
	superAdminRouter.HandleFunc("/users", UpdateUser).Methods("PUT")
	superAdminRouter.HandleFunc("/users", GetUsers).Methods("GET")

	router.PathPrefix("/").Handler(userRouter)
	pages.CreatePagesApp(app.db, getFuncMap(), app.store, app.templates, addr, "PAGES", userRouter)
	// //  ninja
	// ninjaRouter.HandleFunc("/news", pages.CreateNewsHandler).Methods("POST")
	// ninjaRouter.HandleFunc("/news/{newsId}", pages.DeleteNewsHandler).Methods("DELETE")
	app.Info("Server starting on %v", addr)
	app.Fatal(http.ListenAndServe(addr, router))
}
