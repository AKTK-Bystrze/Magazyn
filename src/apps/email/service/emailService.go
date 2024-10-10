package service

import (
	"bystrze/apps/common/models"
	"bystrze/apps/email/appState"
	"context"
	"io"
	"net/smtp"
	"os"
	"strings"

	"github.com/johnsto/go-passwordless/v2"
)

// needed only for testing
func SendEmail(receiver models.User, subject string, message string) error {

	senderEmail := appState.MAGAZYN_BYSTRZE_EMAIL_ADDR
	senderPassword := os.Getenv("MAGAZYM_BYSTRZE_EMAIL_PASS")

	receiverEmail := []string{receiver.Email}
	auth := smtp.PlainAuth("", senderEmail, senderPassword, appState.SMTP_HOST)
	err := smtp.SendMail(appState.SMTP_HOST+":"+appState.SMTP_PORT, auth, senderEmail, receiverEmail, formatEmailMsg(subject, message))
	return err
}

func formatEmailMsg(subject string, message string) []byte {
	return []byte("Subject:" + subject + "\r\n" + message)
}

func GetEmailUsername(email string) string {
	usernameAndDomain := strings.Split(email, "@")
	return usernameAndDomain[0]
}

// emailWriter writes the token to email form.
func EmailWriter(ctx context.Context, token, uid, recipient string, w io.Writer) error {
	e := &passwordless.Email{
		Subject: appState.App.AppName + " signin",
		To:      recipient,
	}

	link := appState.App.Server + "/users/token" +
		"?strategy=email&token=" + token + "&uid=" + uid

	// TODO move it to template
	text := "You (or someone who knows your email address) wants " +
		"to sign in to the " + appState.App.AppName + " website.\n\n" +
		"Your PIN is " + token + " - or use the following link: " +
		link + "\n\n" +
		"(If you were did not request or were not expecting this email, " +
		"you can safely ignore it.)"
	html := "<!doctype html><html><body>" +
		"<p>You (or someone who knows your email address) wants " +
		"to sign in to the " + appState.App.AppName + ".</p>" +
		"<p>Your PIN is <b>" + token + "</b> - or <a href=\"" + link + "\">" +
		"click here</a> to sign in automatically.</p>" +
		"<p>(If you did not request or were not expecting this email, " +
		"you can safely ignore it.)</p></body></html>"

	// Add content types, from least- to most-preferable.
	e.AddBody("text/plain", text)
	e.AddBody("text/html", html)

	_, err := e.Write(w)

	return err
}
