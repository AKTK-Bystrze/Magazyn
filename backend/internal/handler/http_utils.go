// Package handler provides HTTP request handlers and utility functions for the API.
package handler

import (
	"context"
	"encoding/json"
	"errors"
	"magazyn/backend/internal/logger"
	"net/http"
	"strings"
)

// ExtractBearerToken extracts the JWT token from the Authorization header.
// It expects the header format: "Bearer <token>"
// Returns an error if the header is missing or malformed.
func ExtractBearerToken(r *http.Request) (string, error) {
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		return "", errors.New("authorization header required")
	}

	parts := strings.Split(authHeader, " ")
	if len(parts) != 2 || parts[0] != "Bearer" {
		return "", errors.New("invalid authorization header format")
	}

	return parts[1], nil
}

// RespondJSON sends a JSON response with the given status code and data.
// It sets the Content-Type header to application/json and logs any encoding errors.
func RespondJSON(ctx context.Context, w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		logger.Errorf(ctx, "Failed to encode JSON response: %v", err)
	}
}

// RespondError sends a JSON error response with the given status code and message.
// It's a convenience wrapper around RespondJSON for error responses.
func RespondError(ctx context.Context, w http.ResponseWriter, status int, message string) {
	RespondJSON(ctx, w, status, map[string]string{"error": message})
}
