package httpResponse

import (
	"bystrze/apps"
	"bystrze/apps/warehouse/appState"
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type mockLogger struct {
	buf bytes.Buffer
}

func (l *mockLogger) Write(p []byte) (n int, err error) {
	return l.buf.Write(p)
}

func TestResponseErrorMsg(t *testing.T) {
	// Keep track of the original app state
	originalApp := appState.App

	// Create a mock logger
	mockLogger := &mockLogger{}
	
	// Create a mock app with the mock logger
	mockApp := apps.App{
		Logger: log.New(mockLogger, "test: ", log.Lshortfile),
	}

	// Set the global app state to our mock app
	appState.App = mockApp

	// Restore the original app state at the end of the test
	defer func() { appState.App = originalApp }()

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)

	ResponseErrorMsg(recorder, req, "test error")

	if recorder.Code != http.StatusBadRequest {
		t.Errorf("Expected status code %d, but got %d", http.StatusBadRequest, recorder.Code)
	}

	expectedBody := `{"error":"test error"}`
	if strings.TrimSpace(recorder.Body.String()) != expectedBody {
		t.Errorf("Expected body %s, but got %s", expectedBody, recorder.Body.String())
	}
}

