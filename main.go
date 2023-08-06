package main

import (
	"context"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
	"github.com/johnsto/go-passwordless/v2"
	_ "github.com/mattn/go-sqlite3"
)

const SESSION_NAME = "session-name"

var (
	pw *passwordless.Passwordless
	// BASE_URL should contain the root URL of the web server
	BASE_URL                    = os.Getenv("BASE_URL")
	COOKIE_KEY                  = []byte(os.Getenv("COOKIE_KEY"))
	app                         AppState
	tmpl                        *template.Template
	MAGAZYN_BYSTRZE_EMAIL_LOGIN = os.Getenv("MAGAZYN_BYSTRZE_EMAIL_LOGIN")
	MAGAZYN_BYSTRZE_EMAIL_ADDR  = MAGAZYN_BYSTRZE_EMAIL_LOGIN + "@gmail.com"
)

func SearchHandler(w http.ResponseWriter, r *http.Request) {
	SearchItems(w, r, "")
}

type templateData struct {
	UserInfo tmpUser
	URL      string
}

type templateDataIfce interface {
	SetUser(*tmpUser)
	SetURL(string)
}

func (data *templateData) SetUser(uinfo *tmpUser) {
	data.UserInfo = *uinfo
}

func (data *templateData) SetURL(url string) {
	data.URL = url
}

func (app AppState) renderTemplate(w http.ResponseWriter, r *http.Request, tmpl string, data templateDataIfce) {
	uinfo := r.Context().Value("UserInfo").(tmpUser)
	data.SetUser(&uinfo)
	data.SetURL(r.URL.String())
	err := app.templates.ExecuteTemplate(w, tmpl, data)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Template error", http.StatusInternalServerError)
	}
}

func (app AppState) renderTemplateNoData(w http.ResponseWriter, tmpl string) {
	err := app.templates.ExecuteTemplate(w, tmpl, nil)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Template error", http.StatusInternalServerError)
	}
}

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		//  TODO: improve logging
		log.Println(strings.Split(r.RemoteAddr, ":")[0], r.Method, r.RequestURI)
		next.ServeHTTP(w, r)
	})
}

func validUserMiddlware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := app.store.Get(r, SESSION_NAME)
		uid, ok := session.Values["UserInfo"].(int)
		if !ok {
			//  TODO: call Logout here ??
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}
		var uinfo tmpUser
		err := app.db.Get(&uinfo, "SELECT u_username, u_id, u_role FROM users WHERE u_id = ?", uid)
		if err != nil || (uinfo.Role != "user" && uinfo.Role != "admin") {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}
		ctx := r.Context()
		ctx = context.WithValue(ctx, "UserInfo", uinfo)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func adminHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.adminCheck(w, r) {
			h.ServeHTTP(w, r)
		}
	})
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

	//  TODO: .StrictSlash ???
	router := mux.NewRouter()

	db, err := sqlx.Open("sqlite3", "magazyn.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	app.db = db
	app.server = os.Args[3]
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
	}
	validateCOOKIE_KEY()
	app.store = sessions.NewCookieStore(COOKIE_KEY)
	tokStore := passwordless.NewMemStore()
	pw = passwordless.New(tokStore)

	validateBASE_URL()
	setTokenTransportMean()

	app.templates = template.Must(template.New("").Funcs(funcMap).ParseGlob("templates/*.html"))

	log.SetFlags(log.Ldate | log.Ltime | log.Lshortfile)

	//  log all requests
	router.Use(loggingMiddleware)
	router.HandleFunc("/", Login).Methods("GET")
	router.HandleFunc("/login", Login).Methods("GET", "POST")
	router.HandleFunc("/token", tokenHandler).Methods("POST", "GET")

	userRouter := mux.NewRouter()
	userRouter.Use(validUserMiddlware)

	adminRouter := userRouter.PathPrefix("/admin/").Subrouter()
	//  every logged-in user
	userRouter.HandleFunc("/dashboard", UserDashboard).Methods("GET")
	userRouter.HandleFunc("/search", SearchHandler).Methods("GET", "POST")
	userRouter.HandleFunc("/logout", Logout).Methods("GET")
	userRouter.HandleFunc("/reserve", ReserveItem).Methods("POST")

	//  enforce users with admin role
	adminRouter.Use(adminHandler)
	//  admin
	adminRouter.HandleFunc("/reservations", adminDashboardHandler).Methods("GET")
	adminRouter.HandleFunc("/setStatus", setStatusHandler).Methods("POST")
	adminRouter.HandleFunc("/items", adminItemsHandler).Methods("GET")
	adminRouter.HandleFunc("/item/status", adminItemStatusHandler).Methods("POST")
	adminRouter.HandleFunc("/item/show", AdminShowItemHandler).Methods("GET")
	adminRouter.HandleFunc("/user/show", AdminShowUserHandler).Methods("GET")
	adminRouter.HandleFunc("/reservation/show", reservationHandler).Methods("GET")

	router.PathPrefix("/").Handler(userRouter)

	log.Printf("Server starting on %s...\n", addr)
	log.Fatal(http.ListenAndServe(addr, router))
}
