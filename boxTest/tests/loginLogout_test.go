package main

import (
	"boxTest/common/app"
	"boxTest/common/db"
	"errors"
	"testing"
)

func loginThenLogout(userName string) error {
	uc := app.UserClient{
		Name:   userName,
		Client: app.CreateHttpClient(),
	}
	err := uc.Login()
	if err != nil {
		return errors.New("failed Login for" + userName)
	}
	return uc.LogOut()
}

func Test_allUsers(t *testing.T) {
	for _, user := range db.USERS {
		err := loginThenLogout(user.Name)
		if err != nil {
			t.Errorf("Login and logout for %v failed %v", user.Name, err)
		}
	}
}
