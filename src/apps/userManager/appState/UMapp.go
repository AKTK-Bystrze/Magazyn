package appState

import (
	"bystrze/apps"
	"context"
	"net/http"
	"time"

	"github.com/johnsto/go-passwordless/v2"
)

const (
	LOGIN_LINK_VALIDITY_MIN = 10
	TOKEN_LENGTH            = 10
	COOKIE_KEY_LENGTH       = 16
	SESSION_NAME            = "magazynBystrze"
)

var (
	App                         apps.App
	Pw                          Passwordless
	SEND_COOKIE_TO_STDOUT       = true
	COOKIE_KEY                  []byte
	UnauthorizedRedirectHandler func(w http.ResponseWriter, r *http.Request)
	PublicURIs                  []string
)

type Passwordless interface {
	GetStrategy(ctx context.Context, name string) (passwordless.Strategy, error)
	ListStrategies(ctx context.Context) map[string]passwordless.Strategy
	RequestToken(ctx context.Context, s string, uid string, recipient string) error
	SetStrategy(name string, s passwordless.Strategy)
	SetTransport(name string, t passwordless.Transport, g passwordless.TokenGenerator, ttl time.Duration) passwordless.Strategy
	VerifyToken(ctx context.Context, uid string, token string) (bool, error)
}
