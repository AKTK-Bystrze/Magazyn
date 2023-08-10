package main

import (
	"errors"
	"html/template"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
	"github.com/johnsto/go-passwordless/v2"
	"github.com/stretchr/testify/assert"
)

func beforeEach() {
	app.store = sessions.NewCookieStore(COOKIE_KEY)
	tokStore := passwordless.NewMemStore()
	pw = passwordless.New(tokStore)
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
	app.templates = template.Must(template.New("").Funcs(funcMap).ParseGlob("templates/*.html"))
}

func setUpDb() {
	db, err := sqlx.Open("sqlite3", "magazyn.db")
	if err != nil {
		log.Fatal(err)
	}
	app.db = db
}

func Test_userIsNotSignedIn_executeTemplateLogin(t *testing.T) {
	beforeEach()

	req, err := http.NewRequest("GET", "/login", nil)
	if err != nil {
		t.Fatal(err)
	}

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(Login)

	handler.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}

	w := httptest.NewRecorder()
	app.templates.ExecuteTemplate(w, "login.html", struct {
		Strategies map[string]passwordless.Strategy
		Msg        string
	}{
		Strategies: pw.ListStrategies(nil),
		Msg:        "",
	})

	if rr.Body.String() != w.Body.String() {
		t.Errorf("handler returned unexpected body: got %v want %v",
			rr.Body, w.Body)
	}
}

func Test_userIsSignedIn_redirectToDashboard(t *testing.T) {
	beforeEach()
	setUpDb()
	var u tmpUser
	req, err := http.NewRequest("GET", "/login", nil)
	if err != nil {
		t.Fatal(err)
	}

	session, err := app.store.Get(req, SESSION_NAME)
	if err != nil {
		t.Fatal(err)
	}
	session.Values["UserInfo"] = int(u.ID)
	session.Values["recipient"] = "kursant01"
	w := httptest.NewRecorder()
	session.Save(req, w)

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(Login)

	handler.ServeHTTP(rr, req)
	defer app.db.Close()
	if status := rr.Code; status != http.StatusSeeOther {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
	assert.Equal(t, "/dashboard", rr.Result().Header.Get("Location"))
}

func Test_adminIsSignedIn_redirectToAdminDashboard(t *testing.T) {
	beforeEach()
	setUpDb()
	var u tmpUser
	req, err := http.NewRequest("GET", "/login", nil)
	if err != nil {
		t.Fatal(err)
	}

	session, err := app.store.Get(req, SESSION_NAME)
	if err != nil {
		t.Fatal(err)
	}
	session.Values["UserInfo"] = int(u.ID)
	session.Values["recipient"] = "admin01"
	session.Values["UserInfo"] = 2
	w := httptest.NewRecorder()
	session.Save(req, w)

	rr := httptest.NewRecorder()
	handler := http.HandlerFunc(Login)

	handler.ServeHTTP(rr, req)
	defer app.db.Close()
	if status := rr.Code; status != http.StatusSeeOther {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusOK)
	}
	assert.Equal(t, "/admin/reservations", rr.Result().Header.Get("Location"))
}

//token handler
//1 session with wrong cookie
//2 is signedIn
//3 no token provided
//4 provided valid token

func Test_userLoggingWithValidEmail_SendEmailWithToken(t *testing.T) {
	beforeEach()

}
