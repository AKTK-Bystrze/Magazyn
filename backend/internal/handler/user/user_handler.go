// Package user provides HTTP handlers for user profiles, directory listings, and administrative credit adjustments.
package user

import (
	"encoding/json"
	"net/http"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service/user"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

// UserHandler handles HTTP endpoints for user operations.
type UserHandler struct {
	service user.UserService
}

// NewUserHandler creates a new instance of UserHandler.
func NewUserHandler(service user.UserService) *UserHandler {
	return &UserHandler{
		service: service,
	}
}

// HandleGetProfile retrieves a user's full profile by ID or for the current authenticated user ("me").
func (h *UserHandler) HandleGetProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" || id == "me" {
		userID := common.GetUserIDFromContext(r)
		if userID == "" {
			common.RespondUnauthorized(ctx, w)
			return
		}
		id = userID
	}
	resp, err := h.service.GetProfile(ctx, id)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}

// HandleListUsers lists users with optional role and search filters (admin only).
func (h *UserHandler) HandleListUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, perPage := common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)
	role := r.URL.Query().Get("role")
	search := r.URL.Query().Get("search")
	// Validate search length
	if search != "" {
		if err := validation.ValidateStringLength(search, 0, constants.MaxSearchLength); err != nil {
			common.RespondError(ctx, w, http.StatusBadRequest, "Search term too long (max 100 characters)")
			return
		}
	}
	resp, err := h.service.ListUsers(ctx, page, perPage, role, search)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}

// HandleListPublicUsers lists sanitized user profiles for public/team member lookup.
func (h *UserHandler) HandleListPublicUsers(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	page, perPage := common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)
	search := r.URL.Query().Get("search")
	// Validate search length
	if search != "" {
		if err := validation.ValidateStringLength(search, 0, constants.MaxSearchLength); err != nil {
			common.RespondError(ctx, w, http.StatusBadRequest, "Search term too long (max 100 characters)")
			return
		}
	}
	resp, err := h.service.ListPublicUsers(ctx, page, perPage, search)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}

// HandleCreateUser registers a new user (super admin only).
func (h *UserHandler) HandleCreateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req types.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}
	resp, err := h.service.CreateUser(ctx, req)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusCreated, resp)
}

// HandleUpdateUser updates profile properties or disabled state for a user (super admin only).
func (h *UserHandler) HandleUpdateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "ID is required")
		return
	}
	var req types.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}
	resp, err := h.service.UpdateUser(ctx, id, req)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}

// HandleBulkAdjustCredits applies credit additions or deductions across multiple users (super admin only).
func (h *UserHandler) HandleBulkAdjustCredits(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req types.BulkAdjustCreditsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}
	// Manual validation
	if len(req.UserIDs) == 0 {
		common.RespondError(ctx, w, http.StatusBadRequest, "user_ids must not be empty")
		return
	}
	if req.Reason == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "reason is required")
		return
	}
	adminID := common.GetUserIDFromContext(r)
	if adminID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	// Log the incoming request for debugging
	logger.Infof(ctx, "Bulk adjusting credits for %d users by %d (reason: %s)", len(req.UserIDs), req.Amount, req.Reason)
	logger.Debugf(ctx, "BulkAdjustCredits request: user_ids=%v, amount=%d, reason=%s, description=%s",
		req.UserIDs, req.Amount, req.Reason, req.Description)
	err := h.service.BulkAdjustCredits(ctx, adminID, req)
	if err != nil {
		logger.Errorf(ctx, "Bulk adjustment failed: %v", err)
		common.RespondWithError(ctx, w, err)
		return
	}
	logger.Infof(ctx, "Successfully adjusted credits for %d users", len(req.UserIDs))
	common.RespondJSON(ctx, w, http.StatusOK, map[string]string{"message": "Credits adjusted successfully"})
}
