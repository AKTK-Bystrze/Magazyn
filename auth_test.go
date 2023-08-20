package main

import (
	"context"
	"database/sql"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
	"github.com/johnsto/go-passwordless/v2"
	"github.com/stretchr/testify/mock"
)

type MockStore struct {
	mock.Mock
	session sessions.Session
}

func (m *MockStore) Get(r *http.Request, name string) (*sessions.Session, error) {
	return &m.session, nil
}

func (m *MockStore) New(r *http.Request, name string) (*sessions.Session, error) {
	return &m.session, nil
}

func (m *MockStore) Save(r *http.Request, w http.ResponseWriter, s *sessions.Session) error {
	return nil
}

func (a *AppState) Login(w http.ResponseWriter, r *http.Request) {
	Login(w, r)
}

func (a *AppState) tokenHandler(w http.ResponseWriter, r *http.Request) {
	tokenHandler(w, r)
}

type MockPasswordless struct {
	mock.Mock
	Strategies map[string]passwordless.Strategy
	Store      passwordless.TokenStore
}

func (m *MockPasswordless) GetStrategy(ctx context.Context, name string) (passwordless.Strategy, error) {
	return nil, nil
}

func (m *MockPasswordless) RequestToken(ctx context.Context, s string, uid string, recipient string) error {
	args := m.Called(ctx, s, uid, recipient)
	return args.Error(0)
}

func (m *MockPasswordless) SetStrategy(name string, s passwordless.Strategy) {
}

func (m *MockPasswordless) SetTransport(name string, t passwordless.Transport, g passwordless.TokenGenerator, ttl time.Duration) passwordless.Strategy {
	return nil
}

func (m *MockPasswordless) VerifyToken(ctx context.Context, uid string, token string) (bool, error) {
	return false, nil
}

func (m *MockPasswordless) ListStrategies(ctx context.Context) map[string]passwordless.Strategy {
	return nil
}

type mockTemplate struct {
	mock.Mock
}

func (m *mockTemplate) ExecuteTemplate(wr io.Writer, name string, data any) error {
	args := m.Called(wr, name, data)
	return args.Error(0)
}

type MockDatabase struct {
	mock.Mock
	user tmpUser
}

func (m *MockDatabase) Exec(query string, args ...interface{}) (sql.Result, error) {
	return nil, nil
}

func (m *MockDatabase) QueryRow(query string, args ...interface{}) *sql.Row {
	return nil
}

func (m *MockDatabase) Query(query string, args ...interface{}) (*sql.Rows, error) {
	return nil, nil
}

func (m *MockDatabase) Get(dest interface{}, query string, args ...interface{}) error {
	dest = m.user
	return nil
}

func (m *MockDatabase) Prepare(query string) (*sql.Stmt, error) {
	return nil, nil
}

func (m *MockDatabase) Unsafe() *sqlx.DB {
	return nil
}

func (m *MockDatabase) Queryx(query string, args ...interface{}) (*sqlx.Rows, error) {
	return nil, nil
}

func (m *MockDatabase) QueryRowx(query string, args ...interface{}) *sqlx.Row {
	return nil
}

func Test_Login_userIsNotSignedIn_executeTemplateLogin(t *testing.T) {
	mockStore := new(MockStore)
	session := sessions.NewSession(nil, SESSION_NAME)
	session.Values = map[interface{}]interface{}{"UserInfo": nil}
	mockStore.session = *session
	mockTemplate := new(mockTemplate)
	mockTemplate.On("ExecuteTemplate", mock.Anything, "login.html", mock.Anything).Return(nil)

	app = AppState{
		templates: mockTemplate,
		store:     mockStore,
	}
	pw = new(MockPasswordless)

	req, err := http.NewRequest("GET", "/login", nil)
	if err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	handler := http.HandlerFunc(app.Login)

	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Errorf("Expected status code %d, but got %d", http.StatusOK, recorder.Code)
	}

	mockTemplate.AssertExpectations(t)
}

func Test_Login_userIsSignedIn_redirectToDashboard(t *testing.T) {

	testCases := []struct {
		role           string
		RedirectTarget string
	}{
		{"user", "/dashboard"},
		{"admin", "/admin/reservations"},
	}

	for _, tc := range testCases {
		mockStore := new(MockStore)
		session := sessions.NewSession(nil, SESSION_NAME)
		session.Values = map[interface{}]interface{}{"UserInfo": nil}
		session.Values["UserInfo"] = int(1)
		session.Values["recipient"] = tc.role
		mockStore.session = *session
		mockTemplate := new(mockTemplate)
		tmpUser := tmpUser{
			Role: tc.role,
		}
		mockDatabase := new(MockDatabase)
		mockDatabase.user = tmpUser
		app = AppState{
			templates: mockTemplate,
			store:     mockStore,
			db:        mockDatabase,
		}
		pw = new(MockPasswordless)

		req, err := http.NewRequest("GET", "/login", nil)
		if err != nil {
			t.Fatal(err)
		}

		recorder := httptest.NewRecorder()
		handler := http.HandlerFunc(app.Login)

		handler.ServeHTTP(recorder, req)

		if tc.role == "admin" {
			if recorder.Code != http.StatusSeeOther && recorder.Header()["Location"][0] == tc.RedirectTarget {
				t.Errorf("Expected status code %d, but got %d", http.StatusOK, recorder.Code)
			}
		} else {
			if recorder.Code != http.StatusSeeOther && recorder.Header()["Location"][0] == tc.RedirectTarget {
				t.Errorf("Expected status code %d, but got %d", http.StatusOK, recorder.Code)
			}
		}
	}
}

//token handler
//1 session with wrong cookie
//2 is signedIn
//3 no token provided
//4 provided valid token

func Test_tokenHandler_userLoggingWithValidEmail_SendEmailWithToken(t *testing.T) {
	testEmail := "email@address.com"
	mockStore := new(MockStore)
	session := sessions.NewSession(nil, SESSION_NAME)
	session.Values = map[interface{}]interface{}{"UserInfo": nil}
	session.Values["recipient"] = testEmail
	mockStore.session = *session
	mockTemplate := new(mockTemplate)
	mockTemplate.On("ExecuteTemplate", mock.Anything, "tokenGenerated.html", mock.Anything).Return(nil)
	tmpUser := tmpUser{
		Role: "user",
		ID:   1,
	}
	mockDatabase := new(MockDatabase)
	mockDatabase.user = tmpUser
	app = AppState{
		templates: mockTemplate,
		store:     mockStore,
		db:        mockDatabase,
	}
	mockPW := new(MockPasswordless)
	mockPW.On("RequestToken", mock.Anything, "email", "0", testEmail).Return(nil)
	pw = mockPW
	req, err := http.NewRequest("GET", "/token", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Form = map[string][]string{}
	req.Form.Add("strategy", "email")
	req.Form.Add("recipient", testEmail)

	recorder := httptest.NewRecorder()
	handler := http.HandlerFunc(app.tokenHandler)

	handler.ServeHTTP(recorder, req)
	mockTemplate.AssertExpectations(t)
	mockPW.AssertExpectations(t)
}
