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

func getLoginLinkFromLogs(since time.Time, uid int64) string {
	logs := env.GetContainerLogs(env.TEST_APP_NAME, since.Add(-1*time.Second))

	// Search for the most recent occurrence of "Login at" and the specific UID
	loginLink := searchLoginLinkInLogs(logs, uid)
	if loginLink != "" {
		return loginLink
	}

	// If not found, expand the search by getting earlier logs
	for i := 1; i <= 3; i++ { // Arbitrary number of earlier logs to check, you can adjust this
		logs = env.GetContainerLogs(env.TEST_APP_NAME, since.Add(-1*time.Duration(i)*time.Minute))
		loginLink = searchLoginLinkInLogs(logs, uid)
		if loginLink != "" {
			return loginLink
		}
	}

	// If still not found, log and return an empty string
	log.Fatalf("Failed to extract login link for UID %d from logs", uid)
	return ""
}

func searchLoginLinkInLogs(logs string, uid int64) string {
	// Split logs into lines for easier processing
	lines := strings.Split(logs, "\n")
	uidStr := fmt.Sprintf("uid=%d", uid)

	// Iterate over each log line
	for i := len(lines) - 1; i >= 0; i-- { // Start from the latest logs and move backward
		line := lines[i]

		// Check if the line contains "Login at" and the correct uid
		if strings.Contains(line, "Login at ") && strings.Contains(line, uidStr) {
			// Extract the login link after "Login at"
			startIndex := strings.Index(line, "Login at ") + len("Login at ")
			loginLink := strings.TrimSpace(line[startIndex:])
			if strings.Contains(loginLink, uidStr) {
				return loginLink
			}
		}
	}

	return ""
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
	loginLink := getLoginLinkFromLogs(loginTime, uc.User.ID)
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
