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
	"path"
	"strings"
	"time"

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

func main() {
	if len(os.Args) != 5 {
		fmt.Fprintf(os.Stderr, "Usage: %s IP PORT DOMAIN DB_PATH\n", os.Args[0])
		os.Exit(1)
	}
	addr := fmt.Sprintf("%s:%s", os.Args[1], os.Args[2])
	server := os.Args[3]
	common.DATABASE_PATH = os.Args[4]
	common.DATABASE_NAME = path.Base(common.DATABASE_PATH)
	db, err := sqlx.Open("sqlite3", common.DATABASE_PATH)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()
	store := sessions.NewCookieStore(COOKIE_KEY)
	router := mux.NewRouter()

	email.CreateEmailApp(db, getFuncMap(), store, server, "PAGES", router,
		MAGAZYN_BYSTRZE_EMAIL_ADDR, MAGAZYN_BYSTRZE_EMAIL_LOGIN, SMTP_HOST, SMTP_PORT)

	userManager.CreateUserManagerApp(db, getFuncMap(), store, server, "PAGES", router,
		COOKIE_KEY)

	warehouse.CreateWarehouseApp(db, common.DATABASE_PATH, common.DATABASE_NAME,
		getFuncMap(), store, server, "WAREHOUSE", router)

	pages.CreatePagesApp(db, common.DATABASE_PATH, common.DATABASE_NAME,
		getFuncMap(), store, server, "PAGES", router)

	log.Print("Server starting on: " + addr)
	log.Fatal(http.ListenAndServe(addr, router))
}
