package main

import (
	"net/smtp"
	"os"
)

func SendEmail(receiver User, subject string, message string) error {

	senderEmail := MAGAZYN_BYSTRZE_EMAIL
	senderPassword := os.Getenv("MAGAZYM_BYSTRZE_EMAIL_PASS")

	receiverEmail := []string{receiver.Email}
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	auth := smtp.PlainAuth("", senderEmail, senderPassword, smtpHost)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, senderEmail, receiverEmail, formatEmailMsg(subject, message))
	return err
}

func formatEmailMsg(subject string, message string) []byte {
	return []byte("Subject:" + subject + "\r\n" + message)
}
