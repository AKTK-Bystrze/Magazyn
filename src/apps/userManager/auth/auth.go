package auth

import (
	"bystrze/apps/common"
	emailConst "bystrze/apps/email/appState"
	emailService "bystrze/apps/email/service"
	app "bystrze/apps/userManager/appState"

	"fmt"
	"net/smtp"
	"os"
	"time"

	"github.com/gorilla/securecookie"
	"github.com/johnsto/go-passwordless/v2"
)

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
