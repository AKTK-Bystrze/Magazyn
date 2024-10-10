package main

import (
	"bystrze/apps/common"
	"bystrze/apps/email"
	"bystrze/apps/email/service"
	"bystrze/apps/userManager"
	"bystrze/apps/warehouse"
	"fmt"
	"log"
	"net/http"
	"os"
	"path"
	"strconv"
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

func main() {
	common.LOCATION, _ = time.LoadLocation("Europe/Warsaw")
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
	common.SEND_COOKIE_TO_STDOUT, _ = strconv.ParseBool(os.Getenv("DEBUG"))
	store := sessions.NewCookieStore(COOKIE_KEY)
	router := mux.NewRouter()

	email.CreateEmailApp(db, store, server, "EMAIL", router, MAGAZYN_BYSTRZE_EMAIL_ADDR, MAGAZYN_BYSTRZE_EMAIL_LOGIN, SMTP_HOST, SMTP_PORT)

	userManager.CreateUserManagerApp(db, store, server, "USER_MANAGER", router, COOKIE_KEY)

	warehouse.CreateWarehouseApp(db, common.DATABASE_PATH, common.DATABASE_NAME, store, server, "WAREHOUSE", router)

	// pages.CreatePagesApp(db, common.DATABASE_PATH, common.DATABASE_NAME, store, server, "PAGES", router)

	log.Print("Server starting on: " + addr)
	log.Fatal(http.ListenAndServe(addr, router))
}
