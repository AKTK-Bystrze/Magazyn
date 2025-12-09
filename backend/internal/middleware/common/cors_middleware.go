package common

import (
	"magazyn/backend/internal/logger"
	"net/http"
)

// CORSMiddleware creates a CORS (Cross-Origin Resource Sharing) middleware with specified allowed origins.
// It validates the request origin against the allowedOrigins list and sets appropriate CORS headers.
// Preflight OPTIONS requests are handled automatically. Use "*" in allowedOrigins for permissive CORS (not recommended for production).
func CORSMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Check if origin is allowed
			allowed := false
			for _, allowedOrigin := range allowedOrigins {
				if origin == allowedOrigin || allowedOrigin == "*" {
					allowed = true
					break
				}
			}

			// Set CORS headers only for allowed origins
			if allowed && origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			} else if len(allowedOrigins) == 1 && allowedOrigins[0] == "*" {
				// Only use wildcard if explicitly configured
				w.Header().Set("Access-Control-Allow-Origin", "*")
			}

			w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			// Handle preflight OPTIONS request
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
