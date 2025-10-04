package service

import (
	"bystrze/apps/common/timeSet"
	"bystrze/apps/email/appState"
	"bytes"
	"context"
	"io"
	"net/smtp"
	"os"
	"strings"
	"time"

	"github.com/johnsto/go-passwordless/v2"
)
type EmailRecipientList struct {
    To  []string
    Cc  []string
    Bcc []string
}

func SendEmailAsync(recipients EmailRecipientList, subject string, message string) {
    go func() {
        if err := sendMailInternal(recipients, subject, message); err != nil {
            appState.App.Err("Failed to send email: %v", err)
        }
    }()
}

func sendMailInternal(recipients EmailRecipientList, subject string, message string) error {
    if appState.DEBUG {
        appState.App.Debug("Email to %v (Cc: %v, Bcc: %v): Subject: %s, Message: %s", 
            recipients.To, recipients.Cc, recipients.Bcc, subject, message)
        return nil
    }

    senderEmail := appState.MAGAZYN_BYSTRZE_EMAIL_ADDR
    senderPassword := os.Getenv("MAGAZYN_BYSTRZE_EMAIL_PASS")

    toRecipients := append(recipients.To, recipients.Cc...)
    finalRecipients := append(toRecipients, recipients.Bcc...)

    msg := formatEmailMsg(senderEmail, recipients.To, recipients.Cc, subject, message)

    auth := smtp.PlainAuth("", senderEmail, senderPassword, appState.SMTP_HOST)
    err := smtp.SendMail(appState.SMTP_HOST+":"+appState.SMTP_PORT, auth, senderEmail, finalRecipients, msg)
    
    return err
}

func formatEmailMsg(senderEmail string, toList []string, ccList []string, subject string, message string) []byte {
    toHeader := strings.Join(toList, ", ")
    ccHeader := strings.Join(ccList, ", ")

    var headers bytes.Buffer

    headers.WriteString("From: " + senderEmail + "\r\n")
    headers.WriteString("Subject: " + subject + "\r\n")

    if len(toList) > 0 {
        headers.WriteString("To: " + toHeader + "\r\n")
    }
    if len(ccList) > 0 {
        headers.WriteString("Cc: " + ccHeader + "\r\n")
    }
    
    headers.WriteString("MIME-Version: 1.0\r\n")
    headers.WriteString("Content-Type: text/plain; charset=\"utf-8\"\r\n")
    
    // **Crucial: The blank line separating headers from the body**
    headers.WriteString("\r\n") 
    
    headers.WriteString(message)

    return headers.Bytes()
}

func GetEmailUsername(email string) string {
	usernameAndDomain := strings.Split(email, "@")
	return usernameAndDomain[0]
}

// emailWriter writes the token to email form.
func EmailWriter(ctx context.Context, token, uid, recipient string, w io.Writer) error {
	e := &passwordless.Email{
		Subject: appState.APP_NAME + " signin",
		To:      recipient,
	}

	link := appState.App.Server + "/users/token" +
		"?strategy=email&token=" + token + "&uid=" + uid

	// TODO move it to template
	text := "You (or someone who knows your email address) wants " +
		"to sign in to the " + appState.APP_NAME + " website.\n\n" +
		"Your PIN is " + token + " - or use the following link: " +
		link + "\n\n" +
		"(If you were did not request or were not expecting this email, " +
		"you can safely ignore it.)"
	html := "<!doctype html><html><body>" +
		"<p>You (or someone who knows your email address) wants " +
		"to sign in to the " + appState.APP_NAME + ".</p>" +
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


// isAllowedTime checks if the current local time falls outside the restricted 22:00 to 08:00 window.
func IsAllowedTime() bool {
    loc, err := time.LoadLocation(timeSet.LOCATION.String())
    if err != nil {
        appState.App.Err("Failed to load time zone %s: %v. Sending email without time check.", timeSet.LOCATION.String(), err)
        return true
    }

    now := time.Now().In(loc)
    hour := now.Hour()
    isRestricted := hour >= 22 || hour < 8 

    if isRestricted {
        appState.App.Debug("Email sending is restricted between 22:00 and 08:00. Current local time is %s.", now.Format("15:04:05"))
        return false
    }
    return true
}


func CanSendAdminNotification() bool {
    appState.Mu.Lock() 
    defer appState.Mu.Unlock() // Release lock when function exits
    if time.Since(appState.Last_reservation_notification) > appState.RESERVATION_NOTIFICATION_INTERVAL.Abs() {
        appState.Last_reservation_notification = time.Now() 
        return true
    }
    return false
}
