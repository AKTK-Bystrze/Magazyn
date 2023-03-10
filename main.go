package main

import (
    "html/template"
    "log"
    "net/http"
    "os"
    "fmt"
		"time"

    "github.com/gorilla/mux"
    "github.com/gorilla/sessions"
    _ "github.com/mattn/go-sqlite3"
		"github.com/jmoiron/sqlx"
)

const SESSION_NAME = "session-name"

func SearchHandler(w http.ResponseWriter, r *http.Request) {	
	SearchItems(w, r, "")
}

func ReserveHandler(w http.ResponseWriter, r *http.Request) {

}

func renderTemplate(w http.ResponseWriter, tmpl string, data interface{}) {
	err := app.templates.ExecuteTemplate(w, tmpl, data)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}

var app AppState

func main() {
    if len(os.Args) != 3 {
        fmt.Fprintf(os.Stderr, "Usage: %s IP PORT\n", os.Args[0])
        os.Exit(1)
    }

    addr := fmt.Sprintf("%s:%s", os.Args[1], os.Args[2])

    router := mux.NewRouter()

		db, err := sqlx.Open("sqlite3", "magazyn.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
		app.db = db
		app.templates = template.Must(template.ParseGlob("templates/*.html"))
		funcMap := template.FuncMap{
			"Now" : time.Now,
			"Before": func(t1, t2 time.Time) bool {
				return t1.Before(t2)
			},
			"Add": func(t time.Time, d time.Duration) time.Time {
				return t.Add(d)
			},	
		}	
		app.templates.Funcs(funcMap)
		app.store = sessions.NewCookieStore([]byte("secret-key"))

    log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

    router.HandleFunc("/", Login).Methods("GET", "POST")
    router.HandleFunc("/login", Login).Methods("GET", "POST")
    router.HandleFunc("/dashboard", UserDashboard).Methods("GET", "POST")
    router.HandleFunc("/search", SearchHandler).Methods("GET")
    router.HandleFunc("/logout", Logout).Methods("GET")
    router.HandleFunc("/reserve", ReserveItem).Methods("POST")
    router.HandleFunc("/admin/reservations", adminDashboardHandler).Methods("GET")
    router.HandleFunc("/setStatus", setStatusHandler).Methods("POST")
    router.HandleFunc("/admin/items", adminItemsHandler).Methods("GET")
    router.HandleFunc("/item/status", adminItemStatusHandler).Methods("POST")
    router.HandleFunc("/admin/user/show", AdminShowUserHandler).Methods("GET")
    log.Printf("Server starting on %s...\n", addr)
    log.Fatal(http.ListenAndServe(addr, router))
}
