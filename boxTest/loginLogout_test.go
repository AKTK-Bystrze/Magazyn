package main

import (
	"boxTest/common/app"
	"boxTest/common/consts"
	"boxTest/common/httpClient"
	"testing"
)

func Test_user(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := app.LoginAsDefClient(consts.UserName1)
	if err != nil {
		t.Fail()
	}
	app.LogOutDefClient()
}

func Test_admin(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := app.LoginAsDefClient(consts.AdminName1)
	if err != nil {
		t.Fail()
	}
	app.LogOutDefClient()
}

func Test_superAdmin(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := app.LoginAsDefClient(consts.SuperAdminName)
	if err != nil {
		t.Fail()
	}
	app.LogOutDefClient()
}

func Test_ninja(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := app.LoginAsDefClient(consts.NinjaName)
	if err != nil {
		t.Fail()
	}
	app.LogOutDefClient()
}
