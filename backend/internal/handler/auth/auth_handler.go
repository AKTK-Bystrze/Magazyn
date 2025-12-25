package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	authservice "magazyn/backend/internal/service/auth"
	"magazyn/backend/internal/types"
)

// AuthHandler handles HTTP requests for authentication endpoints.
// It orchestrates authentication operations by delegating to the AuthService.
type AuthHandler struct {
	service authservice.AuthService
}

// NewAuthHandler creates a new AuthHandler with the provided authentication service.
func NewAuthHandler(s authservice.AuthService) *AuthHandler {
	return &AuthHandler{service: s}
}

// HandleLogin processes magic link login requests.
// It validates the email, initiates the OTP flow, and sends a magic link to the user's email.
// Request body: {"email": "user@example.com"}
// Response: 200 OK with {"message": "Login link sent to your email"}
func (h *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	var req types.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		logger.Warnf(r.Context(), "Failed to decode login request body: %v", err)
		common.RespondError(r.Context(), w, http.StatusBadRequest, "Invalid request body")
		return
	}

	req.Email = strings.TrimSpace(req.Email)
	if req.Email == "" {
		logger.Warn(r.Context(), "Login attempt with empty email")
		common.RespondError(r.Context(), w, http.StatusBadRequest, "Email is required")
		return
	}

	if _, err := h.service.Login(r.Context(), req.Email); err != nil {
		logger.Errorf(r.Context(), "Failed to initiate login for %s: %v", req.Email, err)
		common.RespondError(r.Context(), w, http.StatusInternalServerError, "Failed to initiate login")
		return
	}

	logger.Infof(r.Context(), "Login link sent to %s", req.Email)
	common.RespondJSON(r.Context(), w, http.StatusOK, types.LoginResponse{Message: "Login link sent to your email"})
}

// HandleLogout processes user logout requests.
// It invalidates the user's session and requires a valid Bearer token in the Authorization header.
// Response: 200 OK with {"message": "Logged out successfully"}
func (h *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	token, err := common.ExtractBearerToken(r)
	if err != nil {
		logger.Warnf(r.Context(), "Token extraction failed: %v", err)
		common.RespondError(r.Context(), w, http.StatusUnauthorized, err.Error())
		return
	}

	if err := h.service.Logout(r.Context(), token); err != nil {
		logger.Errorf(r.Context(), "Logout failed: %v", err)
		common.RespondError(r.Context(), w, http.StatusInternalServerError, "Failed to logout")
		return
	}

	common.RespondJSON(r.Context(), w, http.StatusOK, types.LogoutResponse{Message: "Logged out successfully"})
}

// HandleGetSession retrieves the current user's session information.
// It requires authentication via the auth middleware and returns the user's profile and session details.
// The user context must be populated by the auth middleware before this handler is called.
// Response: 200 OK with session data including user ID, email, username, role, credit balance, and expiry time.
func (h *AuthHandler) HandleGetSession(w http.ResponseWriter, r *http.Request) {
	user := common.GetUserFromContext(r)
	if user == nil {
		logger.Error(r.Context(), "User is nil or invalid in context")
		common.RespondUnauthorized(r.Context(), w)
		return
	}

	// Extract token from Authorization header for RLS enforcement
	token, err := common.ExtractBearerToken(r)
	if err != nil {
		logger.Warnf(r.Context(), "Token extraction failed: %v", err)
		common.RespondError(r.Context(), w, http.StatusUnauthorized, err.Error())
		return
	}

	session, err := h.service.GetSession(r.Context(), user.ID, token)
	if err != nil {
		if errors.Is(err, types.ErrProfileNotFound) {
			common.RespondError(r.Context(), w, http.StatusNotFound, "Profile not found")
		} else {
			logger.Errorf(r.Context(), "Failed to get session for user %s: %v", user.ID, err)
			common.RespondError(r.Context(), w, http.StatusInternalServerError, "Internal server error")
		}
		return
	}

	common.RespondJSON(r.Context(), w, http.StatusOK, session)
}
