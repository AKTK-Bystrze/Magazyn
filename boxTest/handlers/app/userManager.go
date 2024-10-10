package app

import (
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
	logs := env.GetContainerLogs(env.TEST_APP_NAME, since.Add(-1*time.Second))
	//todo it misses loginlink sometimes, that is ugly workaround to move timestamp
	startIndex := strings.LastIndex(logs, "Login at ")
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
	log.Printf("Login \t$%v", uc.User.Name)
	loginTime := time.Now()
	resp := uc.GetRequest(env.Localhost + URL_login)
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Can't get login page: got %v, want %v", resp.StatusCode, http.StatusOK)
	}
	uc.PostFormRequest(env.Localhost+URL_token, url.Values{
		"strategy":  {"debug"},
		"recipient": {uc.User.Name},
	})
	loginLink := getLoginLinkFromLogs(loginTime)
	resp = uc.
		GetRequest(loginLink)
	if resp.StatusCode != http.StatusOK {
		log.Printf("Unexpected status code: got %v, want %v", resp.StatusCode, http.StatusOK)
		return fmt.Errorf("can't login as %v", uc.User.Name)
	}
	return nil
}

func (uc UserClient) LogOut() error {
	log.Printf("Logout %v", uc.User.Name)
	resp := uc.GetRequest(env.Localhost + URL_logout)
	if resp.StatusCode != http.StatusOK {
		log.Printf("Unexpected status code: got %v, want %v", resp.StatusCode, http.StatusOK)
		return fmt.Errorf("can't logout")
	}
	return nil
}
