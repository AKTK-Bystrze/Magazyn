package main

import (
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"time"

	"github.com/gorilla/securecookie"
	"github.com/johnsto/go-passwordless/v2"
)

type tmpUser struct {
	ID   int64  `db:"u_id"`
	Name string `db:"u_username"`
	Role string `db:"u_role"`
}

func Login(w http.ResponseWriter, r *http.Request) {
	session, _ := app.store.Get(r, SESSION_NAME)
	var u tmpUser
	if isSignedIn(session) {
		err := app.db.Get(&u, "SELECT u_username, u_id, u_role FROM users WHERE u_id = ?", session.Values["UserInfo"])
		if err != nil {
			app.Err(err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
			return
		}
		target := "/dashboard"
		if err != nil {
			app.Err(err.Error())
			log.Println(err)
			return
		}
		if u.Role == "admin" {
			target = "/admin/reservations"
		}
		http.Redirect(w, r, target, http.StatusSeeOther)
		return
	} else {
		app.templates.ExecuteTemplate(w, "login.html", struct {
			Strategies map[string]passwordless.Strategy
			Msg        string
		}{
			Strategies: pw.ListStrategies(nil),
			Msg:        "",
		})
		return
	}
}

func Logout(w http.ResponseWriter, r *http.Request) {
	session, _ := app.store.Get(r, SESSION_NAME)
	for key := range session.Values {
		delete(session.Values, key)
	}
	session.Save(r, w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func tokenHandler(w http.ResponseWriter, r *http.Request) {
	target := "/dashboard"
	var u tmpUser
	session, err := app.store.Get(r, SESSION_NAME)
	if err != nil {
		log.Println(err)
		c := &http.Cookie{
			Name:     SESSION_NAME,
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			HttpOnly: true,
		}
		target = "/login"
		http.SetCookie(w, c)
	}

	if isSignedIn(session) {
		session.AddFlash("already_signed_in")
		session.Save(r, w)
		http.Redirect(w, r, target, http.StatusSeeOther)
		return
	}

	// Create a context (required by CookieStore token store)
	ctx := passwordless.SetContext(nil, w, r)

	strategy := r.FormValue("strategy")
	recipient := r.FormValue("recipient")
	uid := r.FormValue("uid")

	// token is only set if the user is trying to verify a token they've got
	token := r.FormValue("token")

	// tokenError will be set if the user enters a bad token.
	tokenError := ""

	if uid == "" {
		// Lookup user ID. We just use the recipient value in this demo,
		// but typically you'd perform a database query here.
		if strategy == "email" {
			err = app.db.Get(&u, "SELECT u_username, u_id, u_role FROM users WHERE u_email = ?", recipient)
		} else {
			err = app.db.Get(&u, "SELECT u_username, u_id, u_role FROM users WHERE u_username = ?", recipient)
		}
		if err != nil {
			app.Err(err.Error())
			log.Println(err)
			return
		}
		uid = fmt.Sprint(u.ID)
	}

	log.Println("strategy=", strategy, "recipient=", recipient, "uid=", uid, "token=", token)

	if strategy == "" {
		// No strategy specified in request, so send the user back to
		// the signin page as we can't do anything without it.
		session.AddFlash("token_not_found")
		session.Save(r, w)
		http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
		return
	} else if token == "" {
		// No token provided in request, so generate a new one and send it
		// to the user via their preferred transport strategy.
		err := pw.RequestToken(ctx, strategy, uid, recipient)

		if err != nil {
			writeError(w, r, session, http.StatusInternalServerError, Error{
				Name:        "Internal Error",
				Description: err.Error(),
				Error:       err,
			})
			return
		}
	} else {
		// User has provided a token, verify it against provided uid.
		valid, err := pw.VerifyToken(ctx, uid, token)

		if valid {
			// User provided a valid token! We can safely use the uid as it
			// is validated alongside the token.

			err = app.db.Get(&u, "SELECT u_username, u_id, u_role FROM users WHERE u_id = ?", uid)

			if err != nil {
				app.Err(err.Error())
				log.Println(err)
				return
			}
			if u.Role == "admin" {
				target = "/admin/reservations"
			}
			session.Values["UserInfo"] = int(u.ID)
			session.Values["recipient"] = recipient
			session.AddFlash("signed_in")
			session.Save(r, w)
			http.Redirect(w, r, target, http.StatusSeeOther)
			return
		}

		if err == passwordless.ErrTokenNotFound {
			// Token not found, maybe it was a previous one or expired. Either
			// way, the user will need to attempt sign-in again.
			session.AddFlash("token_not_found")
			session.Save(r, w)
			http.Redirect(w, r, "/login", http.StatusTemporaryRedirect)
			return
		} else if err != nil {
			// Some other unexpected error occurred.
			writeError(w, r, session, http.StatusInternalServerError, Error{
				Name:        "Failed verifying token",
				Description: err.Error(),
				Error:       err,
			})
			return
		} else {
			// User entered bad token. Set token error string then fall
			// through to template.
			w.WriteHeader(http.StatusForbidden)
			tokenError = "The entered token/PIN was incorrect."
		}
	}

	// If we've got to this point, the user is being prompted to enter a
	// valid token value.

	if err := app.templates.ExecuteTemplate(w, "tokenGenerated.html", struct {
		Strategy   string
		Recipient  string
		UserID     string
		TokenError string
	}{
		Strategy:   strategy,
		Recipient:  recipient,
		UserID:     uid,
		TokenError: tokenError,
	}); err != nil {
		log.Printf("couldn't render template: %v", err)
	}
}

func setTokenTransportMean() {
	if SEND_COOKIE_TO_STDOUT {
		log.Println("No email transport specified, printing codes to stdout")
		pw.SetTransport("debug", passwordless.LogTransport{
			MessageFunc: func(token, uid string) string {
				return fmt.Sprintf("Login at %s/token?strategy=debug&token=%s&uid=%s",
					app.server, token, uid)
			},
		}, passwordless.NewCrockfordGenerator(TOKEN_LENGTH), COOKIE_VALIDITY_TIME*time.Minute)
	} else {
		log.Printf("Using email transport via %s", MAGAZYN_BYSTRZE_EMAIL_ADDR)
		pw.SetTransport("email", passwordless.NewSMTPTransport(
			SMTP_HOST+":"+SMTP_PORT,
			MAGAZYN_BYSTRZE_EMAIL_ADDR,
			smtp.PlainAuth(
				"",
				MAGAZYN_BYSTRZE_EMAIL_LOGIN,
				os.Getenv("MAGAZYM_BYSTRZE_EMAIL_PASS"),
				SMTP_HOST),
			emailWriter,
		), passwordless.NewCrockfordGenerator(TOKEN_LENGTH), COOKIE_VALIDITY_TIME*time.Minute)
	}
}

func validateCOOKIE_KEY() {
	if len(COOKIE_KEY) == 0 {
		log.Println("KEY_COOKIE_STORE not defined; using random key")
		COOKIE_KEY = securecookie.GenerateRandomKey(COOKIE_KEY_LENGTH)
	}
}
