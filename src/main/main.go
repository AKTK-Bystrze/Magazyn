package main

import (
	"bystrze/apps/common"
	"bystrze/apps/email"
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
	COOKIE_KEY                 = []byte(os.Getenv("COOKIE_KEY"))
	MAGAZYN_BYSTRZE_EMAIL_ADDR = os.Getenv("MAGAZYN_BYSTRZE_EMAIL_ADDR")
	SMTP_HOST                  = os.Getenv("SMTP_HOST")
	SMTP_PORT                  = os.Getenv("SMTP_PORT")
)

func main() {
	setLocation()
	IP, PORT, SERVER, DB_PATH := getArgs()
	databaseName := path.Base(DB_PATH)
	db := setDb(DB_PATH)
	defer db.Close()
	debug := setDebugMode()
	store := sessions.NewCookieStore(COOKIE_KEY)
	router := mux.NewRouter()

	email.CreateEmailApp(db, store, SERVER, "EMAIL", router, MAGAZYN_BYSTRZE_EMAIL_ADDR, SMTP_HOST, SMTP_PORT)

	userManager.CreateUserManagerApp(db, store, debug, SERVER, "ACCOUNTS", router, COOKIE_KEY)
	warehouse.CreateWarehouseApp(db, DB_PATH, databaseName, store, SERVER, "WAREHOUSE", router)
	// pages.CreatePagesApp(db, common.DATABASE_PATH, common.DATABASE_NAME, store, server, "PAGES", router)

	ADDR := fmt.Sprintf("%s:%s", IP, PORT)
	log.Print("Server starting on: " + ADDR)
	log.Fatal(http.ListenAndServe(ADDR, router))
}

func setDebugMode() bool {
	var debug bool
	debugEnv, err := strconv.ParseBool(os.Getenv("DEBUG"))
	if err != nil {
		log.Printf("Can't parse DEBUG env %v to bool Err: %v", os.Getenv("DEBUG"), err)
	}
	if os.Getenv("DEBUG") == "" || debugEnv {
		debug = true
	} else {
		debug = false
	}
	return debug
}

func setDb(path string) *sqlx.DB {
	db, err := sqlx.Open("sqlite3", path)
	if err != nil {
		log.Fatal(err)
	}
	return db
}

func getArgs() (string, string, string, string) {
	if len(os.Args) != 5 {
		fmt.Fprintf(os.Stderr, "Usage: %s IP PORT DOMAIN DB_PATH\n", os.Args[0])
		os.Exit(1)
	}
	IP := os.Args[1]
	PORT := os.Args[2]
	SERVER := os.Args[3]
	DB_PATH := os.Args[4]
	return IP, PORT, SERVER, DB_PATH
}

func setLocation() {
	var err error
	common.LOCATION, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		log.Fatalf("Can't get locat time zone")
	}
}
