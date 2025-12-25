package user

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service/user"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

// UserHandler handles HTTP requests for user management.
type UserHandler struct {
	service user.UserService
}

// NewUserHandler creates a new instance of UserHandler.
func NewUserHandler(service user.UserService) *UserHandler {
	return &UserHandler{
		service: service,
	}
}

// HandleGetProfile handles GET /users/me and /users/{id}.
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
		handleError(ctx, w, err)
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, resp)
}

// HandleListUsers handles GET /users.
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
		handleError(ctx, w, err)
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, resp)
}

// HandleCreateUser handles POST /users.
// Only explicitly allowed roles (controlled by Middleware) should access this.
func (h *UserHandler) HandleCreateUser(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	var req types.CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}

	resp, err := h.service.CreateUser(ctx, req)
	if err != nil {
		handleError(ctx, w, err)
		return
	}

	common.RespondJSON(ctx, w, http.StatusCreated, resp)
}

// HandleUpdateUser handles PATCH /users/{id}.
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
		handleError(ctx, w, err)
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, resp)
}

// HandleBulkAdjustCredits handles POST /users/bulk-adjust-credits.
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
		// Return the actual error message for debugging
		common.RespondError(ctx, w, http.StatusInternalServerError, fmt.Sprintf("Failed to adjust credits: %v", err))
		return
	}

	logger.Infof(ctx, "Successfully adjusted credits for %d users", len(req.UserIDs))
	common.RespondJSON(ctx, w, http.StatusOK, map[string]string{"message": "Credits adjusted successfully"})
}

// handleError helper to map service errors to HTTP responses
func handleError(ctx context.Context, w http.ResponseWriter, err error) {
	var notFound *types.NotFoundError
	var conflict *types.ConflictError
	var validation *types.ValidationError
	var forbidden *types.ForbiddenError

	switch {
	case errors.As(err, &notFound):
		common.RespondError(ctx, w, http.StatusNotFound, err.Error())
	case errors.As(err, &conflict):
		common.RespondError(ctx, w, http.StatusConflict, err.Error())
	case errors.As(err, &validation):
		common.RespondError(ctx, w, http.StatusBadRequest, err.Error())
	case errors.As(err, &forbidden):
		common.RespondError(ctx, w, http.StatusForbidden, err.Error())
	default:
		logger.Errorf(ctx, "Internal server error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
	}
}
