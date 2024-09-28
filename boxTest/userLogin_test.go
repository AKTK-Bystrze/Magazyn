package main

import (
	"boxTest/common"
	"fmt"
	"log"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"testing"
	"time"
)

// test
var (
	userName = "kursant1"
)

func getLoginLinkFromLogs(since time.Time) string {
	// Login at http://localhost:8080/users/token?strategy=debug&token=r98dsr7zrh&uid=1
	logs := common.PrintContainerLogs(common.TEST_APP_NAME, since)
	startIndex := strings.Index(logs, "Login at ")
	if startIndex == -1 {
		return ""
	}
	startIndex += len("Login at ")
	return strings.TrimSpace(logs[startIndex:])
}

func TestLoginScenario(t *testing.T) {
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("Failed to create cookie jar: %v", err)
	}

	// Create an http.Client that uses the CookieJar
	client := &http.Client{
		Jar: jar,
	}
	resp, err := client.
		Get("http://localhost:8080/users/login")
	if err != nil {
		log.Printf("/users/login response %v", resp)
		t.Fatalf("Failed request: %v", err)
	}
	loginTime := time.Now()
	resp, err = client.
		PostForm("http://localhost:8080/users/token",
			url.Values{
				"strategy":  {"debug"},
				"recipient": {userName},
			})
	if err != nil {
		log.Printf("/users/token response %v", resp)
		t.Fatalf("Failed request: %v", err)
	}

	loginLink := getLoginLinkFromLogs(loginTime)

	// Step 5: Check if the token was found
	if loginLink == "" {
		t.Error("Failed to extract login link from logs")
	} else {
		fmt.Println("Extracted login link: ", loginLink)
		//TODO what to do with the session cookie that is in the browser "bystrzeMagazyn"
		resp, err = client.
			Get(loginLink)
		if err != nil {
			log.Printf("loginLink response %v", resp)
			t.Fatalf("Failed request: %v", err)
		}

		// Step 7: Check the response from the verification
		if resp.StatusCode != http.StatusOK {
			t.Errorf("Unexpected status code: got %v, want %v", resp.StatusCode, http.StatusOK)
		}
	}
}
