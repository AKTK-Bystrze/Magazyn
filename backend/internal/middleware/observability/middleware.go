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
	// Initialize Sentry handler for asynchronous event dispatching
	sentryHandler := sentryhttp.New(sentryhttp.Options{
		Repanic: true,
	})

	return sentryHandler.Handle(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract or generate Trace ID
		traceID := r.Header.Get("X-Trace-Id")
		if traceID == "" {
			traceID = uuid.New().String()
		}

		// Add to response headers for client tracking
		w.Header().Set("X-Trace-Id", traceID)

		// Create context with trace_id
		ctx := context.WithValue(r.Context(), appcontext.TraceIDContextKey, traceID)
		
		// If using Sentry tracing, we could also attach it to the span here
		if span := sentry.SpanFromContext(ctx); span != nil {
			span.SetTag("trace_id", traceID)
		}

		// Execute next handler
		next.ServeHTTP(w, r.WithContext(ctx))
	}))
}
