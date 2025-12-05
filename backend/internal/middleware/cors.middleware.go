package middleware

import (
	"magazyn/backend/internal/logger"
	"net/http"
)

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Set CORS headers
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
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
