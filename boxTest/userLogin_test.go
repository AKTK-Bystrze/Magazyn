package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"testing"
	"time"

	"github.com/go-resty/resty/v2"
)

// Function to check if the item contains the token
func hasToken(item string, token string) bool {
	return strings.Contains(item, token)
}

// Function to extract the token from the item
func extractToken(item string) string {
	// Example logic to extract the token from the email content
	// Assuming the token follows "Your PIN is " and ends before " - or click here"
	startIndex := strings.Index(item, "Your PIN is ")
	if startIndex == -1 {
		return ""
	}
	startIndex += len("Your PIN is ")
	endIndex := strings.Index(item[startIndex:], " - or click here")
	if endIndex == -1 {
		return ""
	}
	return item[startIndex : startIndex+endIndex]
}

// Function to get the latest email content from MailHog
func getLatestEmailContent() (string, error) {
	resp, err := http.Get("http://localhost:8025/api/v2/messages") // MailHog API endpoint
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Items []struct {
			Content string `json:"Content"`
		} `json:"items"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	if len(result.Items) > 0 {
		return result.Items[0].Content, nil // Return the content of the most recent email
	}

	return "", nil // No emails found
}

// Test function for login scenario
func TestLoginScenario(t *testing.T) {
	// Step 3: Send login request
	email := "test@example.com"
	client := resty.New()
	resp, err := client.R().
		SetFormData(map[string]string{
			"strategy":  "email",
			"recipient": email,
		}).
		Post("http://localhost:8080/token") // Replace with actual endpoint

	if err != nil {
		t.Fatalf("Failed to send login request: %v", err)
	}

	// Step 4: Wait for email to be sent
	time.Sleep(5 * time.Second) // Wait for email to arrive

	// Step 5: Retrieve email content from MailHog
	emailContent, err := getLatestEmailContent()
	if err != nil {
		t.Fatalf("Failed to get email content: %v", err)
	}
	// Extract the token from the email content
	token := extractToken(emailContent)

	// Step 5: Check if the token was found
	if token == "" {
		t.Error("Failed to extract token from email")
	} else {
		fmt.Println("Extracted token:", token)

		// TODO just go to link and not insert id like below
		// // Step 6: Send token verification request
		// // This is assuming you have a user ID to send along with the token
		// userID := "your_user_id_here" // Replace with actual user ID
		// resp, err := client.R().
		// 	SetFormData(map[string]string{
		// 		"strategy":  "email",
		// 		"recipient": email,
		// 		"uid":       userID,
		// 		"token":     token,
		// 	}).
		// 	Post("http://localhost:8080/verify_token") // Replace with actual token verification endpoint

		if err != nil {
			t.Fatalf("Failed to verify token: %v", err)
		}

		// Step 7: Check the response from the verification
		if resp.StatusCode() != http.StatusOK {
			t.Errorf("Unexpected status code: got %v, want %v", resp.StatusCode(), http.StatusOK)
		}
	}
}
