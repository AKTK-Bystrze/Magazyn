package httpResponse

import (
	"bystrze/apps"
	"bystrze/apps/warehouse/appState"
	"bytes"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
)

type mockLogger struct {
	buf bytes.Buffer
}

func (l *mockLogger) Write(p []byte) (n int, err error) {
	return l.buf.Write(p)
}

func TestResponseErrorMsg(t *testing.T) {
	// The function being tested relies on a global App state for logging.
	// We must mock this global state to prevent the test from panicking
	// and to ensure test isolation.
	originalApp := appState.App
	t.Cleanup(func() { appState.App = originalApp }) // Restore original app state

	mockLogger := &mockLogger{}
	mockApp := apps.App{
		Logger: log.New(mockLogger, "test: ", log.Lshortfile),
	}
	appState.App = mockApp

	recorder := httptest.NewRecorder()
	req := httptest.NewRequest("GET", "/", nil)

	ResponseErrorMsg(recorder, req, "test error")

	assert.Equal(t, http.StatusBadRequest, recorder.Code, "Expected status code to be 400 Bad Request")

	expectedBody := `{"error":"test error"}`
	assert.JSONEq(t, expectedBody, recorder.Body.String(), "Expected JSON body to match")
}

