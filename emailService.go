package main

import (
	"context"
	"io"
	"net/smtp"
	"os"

	"github.com/johnsto/go-passwordless/v2"
)

func SendEmail(receiver User, subject string, message string) error {

	senderEmail := MAGAZYN_BYSTRZE_EMAIL_ADDR
	senderPassword := os.Getenv("MAGAZYM_BYSTRZE_EMAIL_PASS")

	receiverEmail := []string{receiver.Email}
	auth := smtp.PlainAuth("", senderEmail, senderPassword, SMTP_HOST)
	err := smtp.SendMail(SMTP_HOST+":"+SMTP_PORT, auth, senderEmail, receiverEmail, formatEmailMsg(subject, message))
	return err
}

func formatEmailMsg(subject string, message string) []byte {
	return []byte("Subject:" + subject + "\r\n" + message)
}

// emailWriter writes the token to email form.
func emailWriter(ctx context.Context, token, uid, recipient string, w io.Writer) error {
	e := &passwordless.Email{
		Subject: APP_NAME + " signin",
		To:      recipient,
	}

	link := BASE_URL + "/token" +
		"?strategy=email&token=" + token + "&uid=" + uid

	// Ideally these would be populated from templates, but...
	text := "You (or someone who knows your email address) wants " +
		"to sign in to the " + APP_NAME + " website.\n\n" +
		"Your PIN is " + token + " - or use the following link: " +
		link + "\n\n" +
		"(If you were did not request or were not expecting this email, " +
		"you can safely ignore it.)"
	html := "<!doctype html><html><body>" +
		"<p>You (or someone who knows your email address) wants " +
		"to sign in to the " + APP_NAME + ".</p>" +
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
