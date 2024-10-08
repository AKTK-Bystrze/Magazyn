package userManagerTests

import (
	"boxTest/common/app"
	"boxTest/common/db"
	"errors"
	"testing"
)

func loginThenLogout(user app.User) error {
	uc := app.UserClient{
		User:   user,
		Client: app.CreateHttpClient(),
	}
	err := uc.Login()
	if err != nil {
		return errors.New("failed Login for" + user.Name)
	}
	return uc.LogOut()
}

func Test_allUsers(t *testing.T) {
	for _, user := range db.USERS {
		err := loginThenLogout(user)
		if err != nil {
			t.Errorf("Login and logout for %v failed %v", user.Name, err)
		}
	}
}
