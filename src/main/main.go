package main

import (
	"bystrze/apps/common"
	"bystrze/apps/email"
	"bystrze/apps/email/service"
	"bystrze/apps/pages"
	"bystrze/apps/userManager"
	"bystrze/apps/warehouse"
	"errors"
	"fmt"
	"html/template"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"path/filepath"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
	_ "github.com/mattn/go-sqlite3"
)

var (
	COOKIE_KEY                  = []byte(os.Getenv("COOKIE_KEY"))
	MAGAZYN_BYSTRZE_EMAIL_ADDR  = os.Getenv("MAGAZYN_BYSTRZE_EMAIL_ADDR")
	MAGAZYN_BYSTRZE_EMAIL_LOGIN = service.GetEmailUsername(MAGAZYN_BYSTRZE_EMAIL_ADDR)
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

func loadTemplates() *template.Template {

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
	templates, err := template.New("").Funcs(funcMap).ParseFiles(files...)
	if err != nil {
		log.Fatal("Error parsing templates: " + err.Error())
	}
	return templates
}

func main() {
	if len(os.Args) != 4 {
		fmt.Fprintf(os.Stderr, "Usage: %s IP PORT DOMAIN\n", os.Args[0])
		os.Exit(1)
	}

	addr := fmt.Sprintf("%s:%s", os.Args[1], os.Args[2])
	db, err := sqlx.Open("sqlite3", common.DATABASE_NAME)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	server := os.Args[3]
	store := sessions.NewCookieStore(COOKIE_KEY)
	templates := loadTemplates()
	router := mux.NewRouter()

	email.CreateEmailApp(db, getFuncMap(), store, templates, server, "PAGES", router,
		MAGAZYN_BYSTRZE_EMAIL_ADDR, MAGAZYN_BYSTRZE_EMAIL_LOGIN, SMTP_HOST, SMTP_PORT)
	userManager.CreateUserManagerApp(db, getFuncMap(), store, templates, server, "PAGES", router,
		COOKIE_KEY)
	warehouse.CreateWarehouseApp(db, common.DATABASE_PATH, common.DATABASE_NAME,
		getFuncMap(), store, templates, server, "WAREHOUSE", router)
	pages.CreatePagesApp(db, common.DATABASE_PATH, common.DATABASE_NAME,
		getFuncMap(), store, templates, server, "PAGES", router)

	log.Print("Server starting on: " + addr)
	log.Fatal(http.ListenAndServe(addr, router))
}
