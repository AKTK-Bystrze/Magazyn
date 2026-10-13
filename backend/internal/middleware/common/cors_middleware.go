// Package common provides shared middleware components such as CORS handling.
package common

import (
	"net/http"

	"magazyn/backend/internal/logger"
)

// CORSMiddleware configures Cross-Origin Resource Sharing headers based on allowed origins.
func CORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			allowed := false
			for _, allowedOrigin := range allowedOrigins {
				if origin == allowedOrigin || allowedOrigin == "*" {
					allowed = true
					break
				}
			}
			if allowed && origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if len(allowedOrigins) == 1 && allowedOrigins[0] == "*" {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}
			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			if r.Method == "OPTIONS" {
				logger.Debug(r.Context(), "Handling CORS preflight request")
				w.WriteHeader(http.StatusOK)
				return
			}
			logger.Debugf(r.Context(), "Incoming request: %s %s", r.Method, r.URL.Path)
			next.ServeHTTP(w, r)
		})
	}
}
