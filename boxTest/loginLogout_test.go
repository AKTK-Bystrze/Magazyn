package main

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/httpClient"
	"testing"
	"time"
)

var waitToLoadPage = 1 * time.Second

func Test_user(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := app.LoginAs(consts.UserName1)
	if err != nil {
		t.Fail()
	}
	time.Sleep(waitToLoadPage)
	app.LogOut()
}

func Test_admin(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := app.LoginAs(consts.AdminName1)
	if err != nil {
		t.Fail()
	}
	time.Sleep(waitToLoadPage)
	app.LogOut()
}

func Test_superAdmin(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := app.LoginAs(consts.SuperAdminName)
	if err != nil {
		t.Fail()
	}
	time.Sleep(waitToLoadPage)
	app.LogOut()
}

func Test_ninja(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := app.LoginAs(consts.NinjaName)
	if err != nil {
		t.Fail()
	}
	time.Sleep(waitToLoadPage)
	app.LogOut()
}
