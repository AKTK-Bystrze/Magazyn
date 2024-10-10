package userManagerTests

import (
	"boxTest/handlers/app"
	"boxTest/handlers/db"
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

func Test_allUsers_loginAndlogut(t *testing.T) {
	for _, user := range db.USERS_MAP {
		err := loginThenLogout(user)
		if err != nil {
			t.Errorf("Login and logout for %v failed %v", user.Name, err)
		}
	}
}

func Test_allUsers_loginSameTime(t *testing.T) {
	for _, user := range db.USERS_MAP {
		uc := app.UserClient{
			User:   user,
			Client: app.CreateHttpClient(),
		}
		err := uc.Login()
		if err != nil {
			t.Errorf("Login for %v failed %v", user.Name, err)
		}
	}
	for _, user := range db.USERS_MAP {
		uc := app.UserClient{
			User:   user,
			Client: app.CreateHttpClient(),
		}
		err := uc.LogOut()
		if err != nil {
			t.Errorf("Logout for %v failed %v", user.Name, err)
		}
	}
}
