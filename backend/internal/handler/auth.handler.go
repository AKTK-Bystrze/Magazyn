package handler

import (
	"encoding/json"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service"
	"net/http"
	"strings"

	"github.com/supabase-community/gotrue-go/types"
)

type AuthHandler struct {
	service *service.AuthService
}

func NewAuthHandler(s *service.AuthService) *AuthHandler {
	return &AuthHandler{service: s}
}

func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req service.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Email == "" {
		http.Error(w, "Email is required", http.StatusBadRequest)
		return
	}

	if err := h.service.Login(req.Email); err != nil {
		logger.Errorf(r.Context(), "Failed to initiate login for %s: %v", req.Email, err)
		http.Error(w, "Failed to initiate login", http.StatusInternalServerError)
		return
	}

	logger.Infof(r.Context(), "Login link sent successfully to %s", req.Email)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(service.LoginResponse{Message: "Login link sent to your email"})
}

func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
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
	json.NewEncoder(w).Encode(service.LogoutResponse{Message: "Logged out successfully"})
}

func (h *AuthHandler) HandleGetSession(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, ok := r.Context().Value(appcontext.UserContextKey).(*types.User)
	if !ok || user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	session, err := h.service.GetSession(r.Context(), user.ID.String())
	if err != nil {
		if err.Error() == "profile not found" {
			logger.Warnf(r.Context(), "Profile not found for user %s", user.ID)
			http.Error(w, "Profile not found", http.StatusNotFound)
		} else {
			logger.Errorf(r.Context(), "Failed to get session for user %s: %v", user.ID, err)
			http.Error(w, "Internal server error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(session)
}
