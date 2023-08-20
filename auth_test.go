package main

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gorilla/sessions"
	"github.com/johnsto/go-passwordless/v2"
	"github.com/stretchr/testify/mock"
)

// type MockDB struct{}

// func (m *MockDB) Get(dest interface{}, query string, args ...interface{}) error {
// 	return nil
// }

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

type MockPasswordless struct {
	mock.Mock
	Strategies map[string]passwordless.Strategy
	Store      passwordless.TokenStore
}

func (m *MockPasswordless) GetStrategy(ctx context.Context, name string) (passwordless.Strategy, error) {
	args := m.Called(ctx, name)
	return args.Get(0).(passwordless.Strategy), args.Error(1)
}

func (m *MockPasswordless) RequestToken(ctx context.Context, s string, uid string, recipient string) error {
	args := m.Called(ctx, s, uid, recipient)
	return args.Error(0)
}

func (m *MockPasswordless) SetStrategy(name string, s passwordless.Strategy) {
	m.Called(name, s)
}

func (m *MockPasswordless) SetTransport(name string, t passwordless.Transport, g passwordless.TokenGenerator, ttl time.Duration) passwordless.Strategy {
	args := m.Called(name, t, g, ttl)
	return args.Get(0).(passwordless.Strategy)
}

func (m *MockPasswordless) VerifyToken(ctx context.Context, uid string, token string) (bool, error) {
	args := m.Called(ctx, uid, token)
	return args.Bool(0), args.Error(1)
}

func (m *MockPasswordless) ListStrategies(ctx context.Context) map[string]passwordless.Strategy {
	return nil //map[string]Strategy
}

type mockTemplate struct {
	mock.Mock
}

func (m *mockTemplate) ExecuteTemplate(wr io.Writer, name string, data any) error {
	args := m.Called(wr, name, data)
	return args.Error(0)
}

func Test_Login_userIsNotSignedIn_executeTemplateLogin(t *testing.T) {
	mockStore := new(MockStore)
	session := sessions.NewSession(nil, SESSION_NAME)
	session.Values = map[interface{}]interface{}{"UserInfo": nil}
	mockStore.session = *session
	mockTemplate := new(mockTemplate)
	mockTemplate.On("ExecuteTemplate", mock.Anything, "login.html", mock.Anything).Return(nil)

	app = AppState{
		templates: mockTemplate, // Actual template instance is not needed in the test
		store:     mockStore,
		server:    "example.com",
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

	mockTemplate.AssertExpectations(t) // Verify that the mock store was called as expected
}
