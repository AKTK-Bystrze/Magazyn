package observability

import (
	"context"
	"net/http"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/google/uuid"

	"magazyn/backend/internal/appcontext"
)

// ObservabilityMiddleware handles trace_id extraction, logger injection, and Sentry panic recovery
func ObservabilityMiddleware(next http.Handler) http.Handler {
	sentryHandler := sentryhttp.New(sentryhttp.Options{
		Repanic: true,
	})

	return sentryHandler.Handle(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := r.Header.Get("X-Trace-Id")
		if traceID == "" {
			traceID = uuid.New().String()
		}

		w.Header().Set("X-Trace-Id", traceID)

		ctx := context.WithValue(r.Context(), appcontext.TraceIDContextKey, traceID)

		if span := sentry.SpanFromContext(ctx); span != nil {
			span.SetTag("trace_id", traceID)
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	}))
}
