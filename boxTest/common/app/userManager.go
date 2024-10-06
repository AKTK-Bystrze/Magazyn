package app

import (
	"boxTest/common/consts"
	"boxTest/env"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var (
	URL_login  = "/users/login"
	URL_token  = "/users/token"
	URL_logout = "/users/user/logout"
)

func getLoginLinkFromLogs(since time.Time) string {
	logs := env.GetContainerLogs(consts.TEST_APP_NAME, since)
	startIndex := strings.Index(logs, "Login at ")
	if startIndex == -1 {
		return ""
	}
	startIndex += len("Login at ")
	loginLink := strings.TrimSpace(logs[startIndex:])
	if loginLink == "" {
		log.Fatal("Failed to extract login link from logs")
	}
	return loginLink
}

func (uc UserClient) Login() error {
	log.Printf("Login \t$%v", uc.Name)
	resp := uc.GetRequest(consts.Localhost + URL_login)
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Can't get login page: got %v, want %v", resp.StatusCode, http.StatusOK)
	}

	loginTime := time.Now()
	uc.PostFormRequest(consts.Localhost+URL_token, url.Values{
		"strategy":  {"debug"},
		"recipient": {uc.Name},
	})
	loginLink := getLoginLinkFromLogs(loginTime)
	resp = uc.
		GetRequest(loginLink)
	if resp.StatusCode != http.StatusOK {
		log.Printf("Unexpected status code: got %v, want %v", resp.StatusCode, http.StatusOK)
		return fmt.Errorf("can't login as %v", uc.Name)
	}
	return nil
}

func (uc UserClient) LogOut() error {
	log.Printf("Logout %v", uc.Name)
	resp := uc.GetRequest(consts.Localhost + URL_logout)
	if resp.StatusCode != http.StatusOK {
		log.Printf("Unexpected status code: got %v, want %v", resp.StatusCode, http.StatusOK)
		return fmt.Errorf("can't logout")
	}
	return nil
}
