package auth

import (
	"bystrze/apps/common"
	"bystrze/apps/common/models"
	sessionPkg "bystrze/apps/common/session"
	emailConst "bystrze/apps/email/appState"
	emailService "bystrze/apps/email/service"
	app "bystrze/apps/userManager/appState"

	"fmt"
	"net/http"
	"net/smtp"
	"os"
	"time"

	"github.com/gorilla/securecookie"
	"github.com/johnsto/go-passwordless/v2"
)

var (
	ERROR_MSG_WRONG_TOKEN     = "Wprowadzony kod jest niepoprawny."
	ERROR_MSG_TOKEN_NOT_FOUND = "token_not_found"
)

func TokenHandler(w http.ResponseWriter, r *http.Request) {
	target := "/users/user/dashboard"
	var u models.User
	session, err := app.App.Store.Get(r, common.SESSION_NAME)
	if err != nil {
		app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
		c := &http.Cookie{
			Name:     common.SESSION_NAME,
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			HttpOnly: true,
		}
		target = "/users/login"
		http.SetCookie(w, c)
	}

	if sessionPkg.IsSignedIn(session) {
		err = app.App.Db.Get(&u, "SELECT u_username, u_id, u_role FROM users WHERE u_id = ?", session.Values["UserInfo"])
		if err != nil {
			app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
		if u.Role == "admin" {
			target = "rental/admin/reservations"
		}
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
		// Lookup user ID.
		if strategy == "email" {
			err = app.App.Db.Get(&u, "SELECT u_username, u_id, u_role, u_credits FROM users WHERE u_email = ?", recipient)
		} else {
			err = app.App.Db.Get(&u, "SELECT u_username, u_id, u_role, u_credits FROM users WHERE u_username = ?", recipient)
		}
		if err != nil {
			app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
			if err := app.App.Templates.ExecuteTemplate(w, "tokenGenerated.html", struct {
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
				app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			}
			return
		}
		uid = fmt.Sprint(u.ID)
	}

	app.App.Info("strategy %v recipient %v uid %v token %v", strategy, recipient, uid, token)

	if strategy == "" {
		// No strategy specified in request, so send the user back to
		// the signin page as we can't do anything without it.
		session.AddFlash(ERROR_MSG_TOKEN_NOT_FOUND)
		session.Save(r, w)
		http.Redirect(w, r, "/users/login", http.StatusTemporaryRedirect)
		return
	} else if token == "" {
		// No token provided in request, so generate a new one and send it
		// to the user via their preferred transport strategy.
		err := app.Pw.RequestToken(ctx, strategy, uid, recipient)

		if err != nil {
			app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
	} else {
		// User has provided a token, verify it against provided uid.
		valid, err := app.Pw.VerifyToken(ctx, uid, token)

		if valid {
			// User provided a valid token! We can safely use the uid as it
			// is validated alongside the token.

			err = app.App.Db.Get(&u, "SELECT u_username, u_id, u_role, u_credits FROM users WHERE u_id = ?", uid)
			if err != nil {
				app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				return
			}
			if u.Role == "admin" {
				target = "rental/admin/reservations"
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
			session.AddFlash(ERROR_MSG_TOKEN_NOT_FOUND)
			session.Save(r, w)
			http.Redirect(w, r, "/users/login", http.StatusTemporaryRedirect)
			return
		} else if err != nil {
			// Some other unexpected error occurred.
			app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		} else {
			// User entered bad token. Set token error string then fall
			// through to template.
			w.WriteHeader(http.StatusForbidden)
			tokenError = ERROR_MSG_WRONG_TOKEN
		}
	}

	// If we've got to this point, the user is being prompted to enter a
	// valid token value.

	if err := app.App.Templates.ExecuteTemplate(w, "tokenGenerated.html", struct {
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
		app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
	}
}

func SetTokenTransportMean() {
	if common.SEND_COOKIE_TO_STDOUT {
		app.App.Info("No email transport specified, printing codes to stdout")
		app.Pw.SetTransport("debug", passwordless.LogTransport{
			MessageFunc: func(token, uid string) string {
				return fmt.Sprintf("\tDEBUG:\t Login at %s/users/token?strategy=debug&token=%s&uid=%s",
					app.App.Server, token, uid)
			},
		}, passwordless.NewCrockfordGenerator(common.TOKEN_LENGTH), common.COOKIE_VALIDITY_TIME_HOURS*time.Hour)
	} else {
		app.App.Info("Using email transport via %s", emailConst.MAGAZYN_BYSTRZE_EMAIL_ADDR)
		app.Pw.SetTransport("email", passwordless.NewSMTPTransport(
			emailConst.SMTP_HOST+":"+emailConst.SMTP_PORT,
			emailConst.MAGAZYN_BYSTRZE_EMAIL_ADDR,
			smtp.PlainAuth(
				"",
				emailConst.MAGAZYN_BYSTRZE_EMAIL_LOGIN,
				os.Getenv("MAGAZYM_BYSTRZE_EMAIL_PASS"),
				emailConst.SMTP_HOST),
			emailService.EmailWriter,
		), passwordless.NewCrockfordGenerator(common.TOKEN_LENGTH), common.COOKIE_VALIDITY_TIME_HOURS*time.Minute)
	}
}

func ValidateCOOKIE_KEY() {
	if len(app.COOKIE_KEY) == 0 {
		app.App.Err("KEY_COOKIE_STORE not defined; using random key")
		app.COOKIE_KEY = securecookie.GenerateRandomKey(common.COOKIE_KEY_LENGTH)
	}
}
