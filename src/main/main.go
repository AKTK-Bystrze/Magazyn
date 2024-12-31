package main

import (
	"bystrze/apps/common/timeSet"
	"bystrze/apps/email"
	"bystrze/apps/userManager"
	"bystrze/apps/warehouse"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

func main() {
	setLocation()

	COOKIE_KEY := []byte(os.Getenv("COOKIE_KEY"))
	MAGAZYN_BYSTRZE_EMAIL_ADDR := os.Getenv("MAGAZYN_BYSTRZE_EMAIL_ADDR")
	SMTP_HOST := os.Getenv("SMTP_HOST")
	SMTP_PORT := os.Getenv("SMTP_PORT")
	IP := os.Getenv("IP")
	SERVER := os.Getenv("SERVER")
	PORT := os.Getenv("PORT")
	checkEnv(IP, PORT)

	DSN := os.Getenv("DATABASE_URL")
	db := setDb(DSN)
	defer db.Close()

	debug := setDebugMode()
	store := sessions.NewCookieStore(COOKIE_KEY)
	router := mux.NewRouter()

	email.CreateEmailApp(db, store, SERVER, "EMAIL", router, MAGAZYN_BYSTRZE_EMAIL_ADDR, SMTP_HOST, SMTP_PORT)
	userManager.CreateUserManagerApp(db, store, debug, SERVER, "ACCOUNTS", router, COOKIE_KEY)
	warehouse.CreateWarehouseApp(db, store, SERVER, "WAREHOUSE", router)
	// pages.CreatePagesApp(db, timeSet.DATABASE_PATH, timeSet.DATABASE_NAME, store, server, "PAGES", router)

	ADDR := fmt.Sprintf("%s:%s", IP, PORT)
	log.Print("Server starting on: " + ADDR)
	log.Fatal(http.ListenAndServe(ADDR, router))
}

func setDebugMode() bool {
	var debug bool
	debugEnv, err := strconv.ParseBool(os.Getenv("DEBUG"))
	if err != nil {
		log.Printf("Can't parse DEBUG env `%v` to bool Err: %v", os.Getenv("DEBUG"), err)
	}
	if os.Getenv("DEBUG") == "" || debugEnv {
		log.Print("DEBUG enabled")
		debug = true
	} else {
		debug = false
	}
	return debug
}

func setDb(dsn string) *sqlx.DB {
	if dsn == "" {
		log.Fatal("DATABASE_URL is not set")
	}
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Printf("db connect retry in 10s")
		time.Sleep(time.Second * 10)
		db, err = sqlx.Connect("postgres", dsn)
		if err != nil {
			log.Fatalf("Failed to connect to the database: %v %v", dsn, err)
		}
	}
	log.Printf("Connected to db: %v", dsn)
	return db
}

func checkEnv(ip string, port string) {
	if ip == "" || port == "" {
		log.Fatal("No IP or PORT os env \n")
		os.Exit(1)
	}
}

func setLocation() {
	var err error
	timeSet.LOCATION, err = time.LoadLocation("Europe/Warsaw")
	if err != nil {
		log.Fatalf("Can't get locat time zone")
	}
}
