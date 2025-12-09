package handler

import (
	"encoding/json"
	"errors"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service"
	model "magazyn/backend/internal/types"
	"net/http"
	"strings"

	"github.com/supabase-community/gotrue-go/types"
)

type AuthHandler struct {
	service service.AuthServiceInterface
}

func NewAuthHandler(s service.AuthServiceInterface) *AuthHandler {
	return &AuthHandler{service: s}
}

func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		logger.Warnf(r.Context(), "Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req service.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Warnf(r.Context(), "Failed to decode login request body: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" {
		logger.Warn(r.Context(), "Login attempt with empty email")
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	if err := h.service.Login(r.Context(), req.Email); err != nil {
		logger.Errorf(r.Context(), "Failed to initiate login for %s: %v", req.Email, err)
		http.Error(w, "Failed to initiate login", http.StatusInternalServerError)
		return
	}

	logger.Infof(r.Context(), "Login link sent to %s", req.Email)

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(service.LoginResponse{Message: "Login link sent to your email"}); err != nil {
		logger.Errorf(r.Context(), "Failed to encode response: %v", err)
	}
}

func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		logger.Warnf(r.Context(), "Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	authHeader := r.Header.Get("Authorization")
	token := strings.TrimPrefix(authHeader, "Bearer ")

	if err := h.service.Logout(r.Context(), token); err != nil {
		logger.Errorf(r.Context(), "Logout failed: %v", err)
		http.Error(w, "Failed to logout", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(service.LogoutResponse{Message: "Logged out successfully"}); err != nil {
		logger.Errorf(r.Context(), "Failed to encode response: %v", err)
	}
}

func (h *AuthHandler) HandleGetSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		logger.Warnf(r.Context(), "Method not allowed: %s", r.Method)
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	val := r.Context().Value(appcontext.UserContextKey)
	user, ok := val.(*types.User)
	if !ok {
		logger.Errorf(r.Context(), "User context key type assertion failed. Actual type: %T, Value: %+v", val, val)
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if user == nil {
		logger.Error(r.Context(), "User is nil in context")
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Extract token from Authorization header for RLS enforcement
	authHeader := r.Header.Get("Authorization")
	token := strings.TrimPrefix(authHeader, "Bearer ")

	session, err := h.service.GetSession(r.Context(), user.ID.String(), token)
	if err != nil {
		if errors.Is(err, model.ErrProfileNotFound) {
			http.Error(w, "Profile not found", http.StatusNotFound)
		} else {
			logger.Errorf(r.Context(), "Failed to get session for user %s: %v", user.ID, err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(session); err != nil {
		logger.Errorf(r.Context(), "Failed to encode response: %v", err)
	}
}
