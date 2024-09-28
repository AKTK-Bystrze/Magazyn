package main

import (
	"boxTest/common/consts"
	"boxTest/common/helpers"
	"boxTest/common/httpClient"
	"testing"
	"time"
)

var waitToLoadPage = 1 * time.Second

func Test_user(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := helpers.LoginAs(consts.UserName1)
	if err != nil {
		t.Fail()
	}
	time.Sleep(waitToLoadPage)
}

func Test_admin(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := helpers.LoginAs(consts.AdminName1)
	if err != nil {
		t.Fail()
	}
	time.Sleep(waitToLoadPage)
}

func Test_superAdmin(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := helpers.LoginAs(consts.SuperAdminName)
	if err != nil {
		t.Fail()
	}
	time.Sleep(waitToLoadPage)
}

func Test_ninja(t *testing.T) {
	httpClient.RestartDefaultClient()
	err := helpers.LoginAs(consts.NinjaName)
	if err != nil {
		t.Fail()
	}
	time.Sleep(waitToLoadPage)
}
