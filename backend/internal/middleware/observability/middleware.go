package observability

import (
	"context"
	"net/http"

	"magazyn/backend/internal/appcontext"

	"github.com/getsentry/sentry-go"
	sentryhttp "github.com/getsentry/sentry-go/http"
	"github.com/google/uuid"
)

func ObservabilityMiddleware(next http.Handler) http.Handler {
	sentryHandler := sentryhttp.New(sentryhttp.Options{
		Repanic: true,
	})
	return sentryHandler.Handle(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := r.Header.Get("X-Trace-Id")
		if traceID == "" {
			traceID = uuid.New().String()
		}
		// Add to response headers for client tracking
		w.Header().Set("X-Trace-Id", traceID)
		// Create context with trace_id
		ctx := context.WithValue(r.Context(), appcontext.TraceIDContextKey, traceID)
		// Attach trace_id to the active Sentry span if present
		if span := sentry.SpanFromContext(ctx); span != nil {
			span.SetTag("trace_id", traceID)
		}
		// Execute next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	}))
}
