package controllers

import (
	"bystrze/apps/common/models"
	sessionPkg "bystrze/apps/common/session"
	app "bystrze/apps/userManager/appState"
	"bystrze/apps/userManager/users"
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"github.com/johnsto/go-passwordless/v2"
)

var (
	ERROR_MSG_WRONG_TOKEN     = "Wprowadzony kod jest niepoprawny."
	ERROR_MSG_TOKEN_NOT_FOUND = "token_not_found"
)

func Logout(w http.ResponseWriter, r *http.Request) {
	session, _ := app.App.Store.Get(r, app.SESSION_NAME)
	for key := range session.Values {
		delete(session.Values, key)
	}
	session.Save(r, w)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func RedirectToLogin(w http.ResponseWriter, r *http.Request) {
	http.Redirect(w, r, "/users/login", http.StatusTemporaryRedirect)
}

func Login(w http.ResponseWriter, r *http.Request) {
	session, _ := app.App.Store.Get(r, app.SESSION_NAME)
	if sessionPkg.IsSignedIn(session) {
		userID := session.Values["UserInfo"].(int)
		u, err := users.GetUserById(userID)
		if err != nil {
			app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
			http.Error(w, "Template error", http.StatusInternalServerError)
			return
		}
		target := "/users/user/dashboard"
		if strings.Contains(u.Role, "admin") {
			target = "/warehouse/admin/reservations"
		}
		http.Redirect(w, r, target, http.StatusSeeOther)
		return
	} else {
		app.App.Templates.ExecuteTemplate(w, "login.html", struct {
			Strategies map[string]passwordless.Strategy
			Msg        string
		}{
			Strategies: app.Pw.ListStrategies(nil),
			Msg:        "",
		})
		return
	}
}

func TokenHandler(w http.ResponseWriter, r *http.Request) {
	target := "/users/user/dashboard"
	var u models.User
	session, err := app.App.Store.Get(r, app.SESSION_NAME)
	if err != nil {
		app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
		c := &http.Cookie{
			Name:     app.SESSION_NAME,
			Value:    "",
			Path:     "/",
			HttpOnly: true,
		}
		target = "/users/login"
		http.SetCookie(w, c)
	}

	if sessionPkg.IsSignedIn(session) {
		userID, ok := session.Values["UserInfo"].(int)
		if !ok {
			handleErrorWithRedirect(w, r, "UserInfo is not a int", err)
		}
		u, err := users.GetUserById(userID)
		if err != nil {
			handleErrorWithRedirect(w, r, "Can't get user", err)
		}
		if u.Role == "admin" {
			target = "/warehouse/admin/reservations"
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
			u, err = users.GetUserByEmail(recipient)
		} else {
			u, err = users.GetByUserName(recipient)
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
				handleErrorWithRedirect(w, r, "Can't get user", err)
			}
			return
		}
		uid = fmt.Sprint(u.ID)
	}
	uidInt, err := strconv.Atoi(uid)
	if err != nil {
		handleErrorWithRedirect(w, r, "Can't parse string id to int", err)
	}
	app.App.Info("strategy %v recipient %v uid %v token %v", strategy, recipient, uid, token)

	if strategy == "" {
		// No strategy specified in request, so send the user back to
		// the signin page as we can't do anything without it.
		session.AddFlash(ERROR_MSG_TOKEN_NOT_FOUND)
		session.Save(r, w)
		RedirectToLogin(w, r)
		return
	} else if token == "" {
		// No token provided in request, so generate a new one and send it
		// to the user via their preferred transport strategy.
		err := app.Pw.RequestToken(ctx, strategy, uid, recipient)
		if err != nil {
			handleErrorWithRedirect(w, r, "Can't request token", err)
		}
	} else {
		// User has provided a token, verify it against provided uid.
		valid, err := app.Pw.VerifyToken(ctx, uid, token)
		if valid {
			// User provided a valid token! We can safely use the uid as it
			// is validated alongside the token.

			u, err = users.GetUserById(uidInt)
			if err != nil {
				app.App.Err("%v %v", sessionPkg.GetSessionUserName(r), err.Error())
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				return
			}
			if u.Role == "admin" {
				target = "/warehouse/admin/reservations"
			}
			session.Values["UserInfo"] = uidInt
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
			RedirectToLogin(w, r)
			return
		} else if err != nil {
			handleErrorWithRedirect(w, r, "Unexpected error", err)
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

func handleErrorWithRedirect(w http.ResponseWriter, r *http.Request, msg string, err error) {
	app.App.Err("%v %v %v", sessionPkg.GetSessionUserName(r), msg, err.Error())
	http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
}
