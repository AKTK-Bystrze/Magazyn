package appState

import (
	"bystrze/apps"
	"context"
	"time"

	"github.com/johnsto/go-passwordless/v2"
)

var (
	App                         apps.App
	Pw                          Passwordless
	COOKIE_KEY                  []byte
)

type Passwordless interface {
	GetStrategy(ctx context.Context, name string) (passwordless.Strategy, error)
	ListStrategies(ctx context.Context) map[string]passwordless.Strategy
	RequestToken(ctx context.Context, s string, uid string, recipient string) error
	SetStrategy(name string, s passwordless.Strategy)
	SetTransport(name string, t passwordless.Transport, g passwordless.TokenGenerator, ttl time.Duration) passwordless.Strategy
	VerifyToken(ctx context.Context, uid string, token string) (bool, error)
}

const (
	COOKIE_VALIDITY_TIME_HOURS = 6
	SEND_COOKIE_TO_STDOUT      = true
	TOKEN_LENGTH               = 10
	COOKIE_KEY_LENGTH          = 16

	APP_NAME      = "E-magazyn Bystrze"
	SESSION_NAME  = "magazynBystrze"
	DATABASE_NAME = "magazyn.db"
	DATABASE_PATH = "./magazyn.db"
)
