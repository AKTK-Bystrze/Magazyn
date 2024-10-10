package auth

import (
	"bystrze/apps"
	"bystrze/apps/common"
	"bystrze/apps/common/models"
	"bystrze/apps/common/session"
	"bystrze/apps/userManager/controllers"
	"context"
	"database/sql"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gorilla/sessions"
	"github.com/jmoiron/sqlx"
	"github.com/johnsto/go-passwordless/v2"
	"github.com/stretchr/testify/mock"
)

var (
	TEST_UID_STR                 = fmt.Sprint(mock.Anything)
	TEST_UID_NB, _               = strconv.ParseInt(TEST_UID_STR, 10, 64)
	TEST_TOKEN                   = "WRONG_TEST_TOKEN"
	TEST_ROLE                    = "role"
	TEST_TOKEN_ERROR_MESSAGE     = "The entered token/PIN was incorrect."
	TEST_EMAIL                   = "email@address.com"
	EMAIL                        = "email"
	EXPECTED_STATUS_CODE_BUT_GOT = "Expected status code %d, but got %d"
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
	args := m.Called(ctx, uid, token)
	return args.Bool(0), args.Error(1)
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
	user models.User
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

type MockSessionStore struct {
	store session.SessionStore
	mock.Mock
}

func (m *MockSessionStore) Get(r *http.Request, name string) (*sessions.Session, error) {
	return nil, nil
}
func (m *MockSessionStore) New(r *http.Request, name string) (*sessions.Session, error) {
	return nil, nil
}

func (m *MockSessionStore) Save(r *http.Request, w http.ResponseWriter, s *sessions.Session) error {
	return nil
}

func Test_Login_userIsNotSignedIn_executeTemplateLogin(t *testing.T) {
	mockStore := new(MockStore)
	session := sessions.NewSession(nil, common.SESSION_NAME)
	session.Values = map[interface{}]interface{}{"UserInfo": nil}
	mockStore.session = *session
	mockTemplate := new(mockTemplate)
	mockTemplate.On("ExecuteTemplate", mock.Anything, "login.html", mock.Anything).Return(nil)

	app := apps.App{
		Store:     mockStore,
		Templates: mockTemplate,
	}
	pw := new(MockPasswordless)

	req, err := http.NewRequest("GET", "/login", nil)
	if err != nil {
		t.Fatal(err)
	}

	recorder := httptest.NewRecorder()
	handler := http.HandlerFunc(controllers.Login)

	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusOK {
		t.Errorf(EXPECTED_STATUS_CODE_BUT_GOT, http.StatusOK, recorder.Code)
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
		session := sessions.NewSession(nil, common.SESSION_NAME)
		session.Values = map[interface{}]interface{}{}
		session.Values["UserInfo"] = TEST_UID_NB
		session.Values["recipient"] = tc.role
		mockStore.session = *session
		mockTemplate := new(mockTemplate)
		tmpUser := models.User{
			Role: tc.role,
		}
		mockDatabase := new(MockDatabase)
		mockDatabase.user = tmpUser
		app := apps.App{
			Store:     mockStore,
			Templates: mockTemplate,
			Db:        mockDatabase,
		}
		pw := new(MockPasswordless)

		req, err := http.NewRequest("GET", "/login", nil)
		if err != nil {
			t.Fatal(err)
		}

		recorder := httptest.NewRecorder()
		handler := http.HandlerFunc(controllers.Login)

		handler.ServeHTTP(recorder, req)

		if tc.role == "admin" {
			if recorder.Code != http.StatusSeeOther && recorder.Header()["Location"][0] != tc.RedirectTarget {
				t.Errorf(EXPECTED_STATUS_CODE_BUT_GOT, http.StatusOK, recorder.Code)
			}
		} else {
			if recorder.Code != http.StatusSeeOther && recorder.Header()["Location"][0] != tc.RedirectTarget {
				t.Errorf(EXPECTED_STATUS_CODE_BUT_GOT, http.StatusOK, recorder.Code)
			}
		}
	}
}

func Test_tokenHandler_userLoggingWithValidEmail_SendEmailWithToken(t *testing.T) {
	mockStore := new(MockStore)
	session := sessions.NewSession(nil, common.SESSION_NAME)
	session.Values = map[interface{}]interface{}{"UserInfo": nil}
	session.Values["recipient"] = TEST_EMAIL
	mockStore.session = *session
	mockTemplate := new(mockTemplate)
	mockTemplate.On("ExecuteTemplate", mock.Anything, "tokenGenerated.html", mock.Anything).Return(nil)
	tmpUser := models.User{
		Role: "user",
		ID:   TEST_UID_NB,
	}
	mockDatabase := new(MockDatabase)
	mockDatabase.user = tmpUser
	app := apps.App{
		Templates: mockTemplate,
		Store:     mockStore,
		Db:        mockDatabase,
	}
	mockPW := new(MockPasswordless)
	mockPW.On("RequestToken", mock.Anything, EMAIL, TEST_UID_STR, TEST_EMAIL).Return(nil)
	pw := mockPW
	req, err := http.NewRequest("GET", "/token", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Form = map[string][]string{}
	req.Form.Add("strategy", EMAIL)
	req.Form.Add("recipient", TEST_EMAIL)
	req.Form.Add("uid", TEST_UID_STR)

	recorder := httptest.NewRecorder()
	handler := http.HandlerFunc(controllers.TokenHandler)

	handler.ServeHTTP(recorder, req)
	mockTemplate.AssertExpectations(t)
	mockPW.AssertExpectations(t)
}
func Test_tokenHandler_userProvideValidToken_redirectToDashBoard(t *testing.T) {
	testCases := []struct {
		role           string
		RedirectTarget string
	}{
		{"user", "/dashboard"},
		{"admin", "/admin/reservations"},
	}

	for _, tc := range testCases {
		mockStore := new(MockStore)
		session := sessions.NewSession(new(MockSessionStore), common.SESSION_NAME)
		session.Values = map[interface{}]interface{}{"UserInfo": nil}
		session.Values["recipient"] = tc.role
		mockStore.session = *session
		mockTemplate := new(mockTemplate)
		tmpUser := models.User{
			Role: tc.role,
			ID:   TEST_UID_NB,
		}
		mockDatabase := new(MockDatabase)
		mockDatabase.user = tmpUser
		app := apps.App{
			Templates: mockTemplate,
			Store:     mockStore,
			Db:        mockDatabase,
		}
		mockPW := new(MockPasswordless)
		mockPW.On("VerifyToken", mock.Anything, TEST_UID_STR, TEST_TOKEN).Return(true, nil)
		pw := mockPW
		req, err := http.NewRequest("GET", "/token", nil)
		if err != nil {
			t.Fatal(err)
		}
		req.Form = map[string][]string{}
		req.Form.Add("strategy", EMAIL)
		req.Form.Add("recipient", tc.role)
		req.Form.Add("token", TEST_TOKEN)
		req.Form.Add("uid", TEST_UID_STR)

		recorder := httptest.NewRecorder()
		handler := http.HandlerFunc(controllers.TokenHandler)

		handler.ServeHTTP(recorder, req)
		if tc.role == "admin" {
			if recorder.Code != http.StatusSeeOther && recorder.Header()["Location"][0] != tc.RedirectTarget {
				t.Errorf(EXPECTED_STATUS_CODE_BUT_GOT, http.StatusOK, recorder.Code)
			}
		} else {
			if recorder.Code != http.StatusSeeOther && recorder.Header()["Location"][0] != tc.RedirectTarget {
				t.Errorf(EXPECTED_STATUS_CODE_BUT_GOT, http.StatusOK, recorder.Code)
			}
		}
		mockPW.AssertExpectations(t)
	}
}

func Test_tokenHandler_userProvideWrongToken_ExecuteTemplateWithTokenError(t *testing.T) {
	mockStore := new(MockStore)
	session := sessions.NewSession(new(MockSessionStore), common.SESSION_NAME)
	session.Values = map[interface{}]interface{}{"UserInfo": nil}
	session.Values["recipient"] = TEST_ROLE
	mockStore.session = *session
	mockTemplate := new(mockTemplate)
	mockTemplate.On("ExecuteTemplate", mock.Anything, "tokenGenerated.html", struct {
		Strategy   string
		Recipient  string
		UserID     string
		TokenError string
	}{
		Strategy:   EMAIL,
		Recipient:  TEST_ROLE,
		UserID:     TEST_UID_STR,
		TokenError: controllers.ERROR_MSG_WRONG_TOKEN,
	}).Return(nil)
	tmpUser := models.User{
		Role: TEST_ROLE,
		ID:   TEST_UID_NB,
	}
	mockDatabase := new(MockDatabase)
	mockDatabase.user = tmpUser
	app := apps.App{
		Templates: mockTemplate,
		Store:     mockStore,
		Db:        mockDatabase,
	}
	mockPW := new(MockPasswordless)
	mockPW.On("VerifyToken", mock.Anything, TEST_UID_STR, TEST_TOKEN).Return(false, nil)
	pw := mockPW
	req, err := http.NewRequest("GET", "/token", nil)
	if err != nil {
		t.Fatal(err)
	}
	req.Form = map[string][]string{}
	req.Form.Add("strategy", EMAIL)
	req.Form.Add("recipient", TEST_ROLE)
	req.Form.Add("token", TEST_TOKEN)
	req.Form.Add("uid", TEST_UID_STR)

	recorder := httptest.NewRecorder()
	handler := http.HandlerFunc(controllers.TokenHandler)

	handler.ServeHTTP(recorder, req)
	mockPW.AssertExpectations(t)
	mockTemplate.AssertExpectations(t)
}

func Test_tokenHandler_userIsSignedIn_Redirect(t *testing.T) {
	testCases := []struct {
		role           string
		RedirectTarget string
	}{
		{"user", "/dashboard"},
		{"admin", "/admin/reservations"},
	}

	for _, tc := range testCases {
		mockStore := new(MockStore)
		session := sessions.NewSession(new(MockSessionStore), common.SESSION_NAME)
		session.Values = map[interface{}]interface{}{}
		session.Values["UserInfo"] = TEST_UID_NB
		session.Values["recipient"] = tc.role
		mockStore.session = *session
		mockDatabase := new(MockDatabase)
		tmpUser := models.User{
			Role: tc.role,
			ID:   TEST_UID_NB,
		}
		mockDatabase.user = tmpUser
		app := apps.App{
			Store: mockStore,
			Db:    mockDatabase,
		}

		req, err := http.NewRequest("GET", "/token", nil)
		if err != nil {
			t.Fatal(err)
		}

		recorder := httptest.NewRecorder()
		handler := http.HandlerFunc(controllers.TokenHandler)

		handler.ServeHTTP(recorder, req)
		if tc.role == "admin" {
			if recorder.Code != http.StatusSeeOther && recorder.Header()["Location"][0] != tc.RedirectTarget {
				t.Errorf(EXPECTED_STATUS_CODE_BUT_GOT, http.StatusOK, recorder.Code)
			}
		} else {
			if recorder.Code != http.StatusSeeOther && recorder.Header()["Location"][0] != tc.RedirectTarget {
				t.Errorf(EXPECTED_STATUS_CODE_BUT_GOT, http.StatusOK, recorder.Code)
			}
		}

	}
}
