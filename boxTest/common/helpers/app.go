package helpers

import (
	"boxTest/common/consts"
	"boxTest/common/httpClient"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"
)

func getLoginLinkFromLogs(since time.Time) string {
	logs := GetContainerLogs(consts.TEST_APP_NAME, since)
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

func LoginAs(userName string) error {
	httpClient.DefaultClient = httpClient.CreateHttpClient()
	resp := httpClient.GetRequest("http://localhost:8080/users/login")
	if resp.StatusCode != http.StatusOK {
		log.Fatalf("Can't get login page: got %v, want %v", resp.StatusCode, http.StatusOK)
	}

	loginTime := time.Now()
	httpClient.PostFormRequest("http://localhost:8080/users/token", url.Values{
		"strategy":  {"debug"},
		"recipient": {userName},
	})
	loginLink := getLoginLinkFromLogs(loginTime)
	resp = httpClient.
		GetRequest(loginLink)
	if resp.StatusCode != http.StatusOK {
		log.Printf("Unexpected status code: got %v, want %v", resp.StatusCode, http.StatusOK)
		return fmt.Errorf("can't login as %v", userName)
	}
	return nil
}
