package main

import (
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
	pw                          Passwordless
	COOKIE_KEY                  = []byte(os.Getenv("COOKIE_KEY"))
	app                         AppState
	tmpl                        *template.Template
	MAGAZYN_BYSTRZE_EMAIL_ADDR  = os.Getenv("MAGAZYN_BYSTRZE_EMAIL_ADDR")
	MAGAZYN_BYSTRZE_EMAIL_LOGIN = getEmailUsername(MAGAZYN_BYSTRZE_EMAIL_ADDR)
	SMTP_HOST                   = os.Getenv("SMTP_HOST")
	SMTP_PORT                   = os.Getenv("SMTP_PORT")
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

func (app AppState) renderTemplate(w http.ResponseWriter, r *http.Request, tmpl string, data templateDataIfce) {
	if uinfo, ok := r.Context().Value("UserInfo").(tmpUser); ok {
		data.SetUser(&uinfo)
		data.SetURL(r.URL.String())
		err := app.templates.ExecuteTemplate(w, tmpl, data)
		if err != nil {
			app.Err("%v %v", getUserName(r), err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
		}
	} else {
		err := app.templates.ExecuteTemplate(w, tmpl, data)
		if err != nil {
			app.Err("%v %v", getUserName(r), err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
		}
	}
}

func (app AppState) renderTemplateNoData(w http.ResponseWriter, tmpl string) {
	err := app.templates.ExecuteTemplate(w, tmpl, nil)
	if err != nil {
		app.Err(err.Error())
		http.Error(w, "Template error", http.StatusInternalServerError)
	}
}

func validUserMiddlware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		session, _ := app.store.Get(r, SESSION_NAME)
		uid, ok := session.Values["UserInfo"].(int)
		if !ok {
			app.Warn("Unauthorized %v %v %v", strings.Split(r.RemoteAddr, ":")[0], r.Method, r.RequestURI)
			if r.RequestURI != "/" {
				http.Redirect(w, r, "/", http.StatusSeeOther)
			}
			homePage(w, r)
			return
		}
		var uinfo tmpUser
		err := app.db.Get(&uinfo, "SELECT u_username, u_id, u_role, u_credits FROM users WHERE u_id = ?", uid)
		if err != nil || !isRoleValid(uinfo.Role) {
			http.Redirect(w, r, "/", http.StatusSeeOther)
			return
		}
		ctx := r.Context()
		ctx = context.WithValue(ctx, "UserInfo", uinfo)
		app.Info("%v %v %v %v", uinfo.Name, strings.Split(r.RemoteAddr, ":")[0], r.Method, r.RequestURI)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func isRoleValid(userRole string) bool {
	for _, privilige := range PRIVILIGES {
		if strings.Contains(userRole, privilige) {
			return true
		}
	}
	return false
}

func adminHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.hasAdminPrivilege(w, r) {
			h.ServeHTTP(w, r)
		}
	})
}

func ninjaHandler(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if app.hasNinjaPrivilege(w, r) {
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

	db, err := sqlx.Open("sqlite3", DATABASE_NAME)
	if err != nil {
		app.Fatal(err)
	}
	defer db.Close()
	app.db = db
	app.server = os.Args[3]

	validateCOOKIE_KEY()
	app.store = sessions.NewCookieStore(COOKIE_KEY)
	tokStore := passwordless.NewMemStore()
	pw = passwordless.New(tokStore)

	setTokenTransportMean()
	app.setLogger()

	loadTemplates()

	router.HandleFunc("/login", Login).Methods("GET")
	router.HandleFunc("/token", tokenHandler).Methods("POST", "GET")
	userRouter := mux.NewRouter()
	userRouter.Use(validUserMiddlware)
	userRouter.HandleFunc("/", homePage).Methods("GET")
	adminRouter := userRouter.PathPrefix("/admin").Subrouter()
	//  every logged-in user
	userRouter.HandleFunc("/dashboard", UserDashboard).Methods("GET")
	userRouter.HandleFunc("/search", SearchHandler).Methods("GET", "POST")
	userRouter.HandleFunc("/logout", Logout).Methods("GET")
	userRouter.HandleFunc("/reserve", ReserveItem).Methods("POST")

	//  enforce users with admin role
	adminRouter.Use(adminHandler)
	//  admin
	adminRouter.HandleFunc("/reservations", adminDashboardHandler).Methods("GET")
	adminRouter.HandleFunc("/setStatus", setStatusHandler).Methods("PUT")
	adminRouter.HandleFunc("/items", adminItemsHandler).Methods("GET")
	adminRouter.HandleFunc("/item/status", adminItemStatusHandler).Methods("POST")
	adminRouter.HandleFunc("/item/show", AdminShowItemHandler).Methods("GET")
	adminRouter.HandleFunc("/user/show", AdminShowUserHandler).Methods("GET")
	adminRouter.HandleFunc("/reservation/show", reservationHandler).Methods("GET")
	adminRouter.HandleFunc("/db/backup", dbBackupHandler).Methods("GET")
	adminRouter.HandleFunc("/inventory", inventory).Methods("GET")

	//  enforce users with ninja role
	ninjaRouter := userRouter.PathPrefix("/ninja").Subrouter()
	ninjaRouter.Use(ninjaHandler)
	//  ninja
	ninjaRouter.HandleFunc("/news", createNewsHandler).Methods("POST")
	ninjaRouter.HandleFunc("/news/{newsId}", deleteNewsHandler).Methods("DELETE")

	router.PathPrefix("/").Handler(userRouter)

	app.Info("Server starting on %v", addr)
	app.Fatal(http.ListenAndServe(addr, router))
}
