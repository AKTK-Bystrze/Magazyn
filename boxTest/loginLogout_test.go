package main

import (
	"boxTest/common/consts"
	"boxTest/common/helpers"
	"testing"
)

func Test_user(t *testing.T) {
	err := helpers.LoginAs(consts.UserName1)
	if err != nil {
		t.Fail()
	}
}
