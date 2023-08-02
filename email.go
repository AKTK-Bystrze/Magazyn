package main

import (
	"net/smtp"
)

func sendEmail(receiver User, topic string, content []byte) error {

	senderEmail := "from@gmail.com"
	senderPassword := "<Email Password>" //TODO! hide password

	receiverEmail := []string{receiver.Email}
	smtpHost := "smtp.gmail.com"
	smtpPort := "587"
	auth := smtp.PlainAuth("", senderEmail, senderPassword, smtpHost)
	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, senderEmail, receiverEmail, content)
	return err
}
