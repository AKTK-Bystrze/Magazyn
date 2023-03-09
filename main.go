package main

import (
    "database/sql"
    "html/template"
    "log"
    "net/http"
    "time"
    "os"
    "fmt"

    "github.com/gorilla/mux"
    "github.com/gorilla/sessions"
    _ "github.com/mattn/go-sqlite3"
)

const SESSION_NAME = "session-name"

func UserDashboard(w http.ResponseWriter, r *http.Request) {
    // check if the user is logged in
    session, _ := app.store.Get(r, SESSION_NAME)
    role := session.Values["role"]
    if role == nil || role.(string) != "user" {
        http.Redirect(w, r, "/", http.StatusSeeOther)
        return
    }
    // search for reserved items in the db
    rows, err := app.db.Query(`
        SELECT r.*,c.name,c.description from reservations r
        JOIN items c ON r.item_id = c.id
        WHERE user_id = ?
    `, session.Values["user_id"]);
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    // create a list of available items
    type reservationInfo struct {
      Id int
      Item_id int
      User_id int
      Start_time time.Time
      End_time time.Time
      Name string
      Desc string
			Status string
    }
    var reservedItems []reservationInfo
    for rows.Next() {
        var item reservationInfo
        if err := rows.Scan(&item.Id, &item.Item_id,
         &item.User_id,
         &item.Start_time,
         &item.End_time,
         &item.Status,
         &item.Name,
         &item.Desc); err != nil {
            log.Fatal(err)
        }
        reservedItems = append(reservedItems, item)
    }
    if err := rows.Err(); err != nil {
        log.Fatal(err)
    }

    err = app.templates.ExecuteTemplate(w, "user_dashboard.html", struct {
        Username       string
        Reservations []reservationInfo
    }{
        Username:       session.Values["username"].(string),
        Reservations:   reservedItems,
    })
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
}

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

type AppState struct {
	db *sql.DB
	templates *template.Template
	store *sessions.CookieStore
}

var app AppState

func main() {
    if len(os.Args) != 3 {
        fmt.Fprintf(os.Stderr, "Usage: %s IP PORT\n", os.Args[0])
        os.Exit(1)
    }

    addr := fmt.Sprintf("%s:%s", os.Args[1], os.Args[2])

    router := mux.NewRouter()

		db, err := sql.Open("sqlite3", "magazyn.db")
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()
		app.db = db
		app.templates = template.Must(template.ParseGlob("templates/*.html"))
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
    log.Printf("Server starting on %s...\n", addr)
    log.Fatal(http.ListenAndServe(addr, router))
}
