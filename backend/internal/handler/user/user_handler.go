package user

import (
	"context"
	"encoding/json"
	"errors"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service/user"
	"magazyn/backend/internal/types"
	"net/http"
	"strconv"
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

// getUserID retrieves the authenticated user's ID from the request context.
func getUserID(r *http.Request) string {
	val := r.Context().Value(appcontext.UserContextKey)
	if u, ok := val.(*types.User); ok {
		return u.ID
	}
	return ""
}

// HandleGetProfile handles GET /users/me and /users/{id}.
func (h *UserHandler) HandleGetProfile(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")

	if id == "" || id == "me" {
		userID := getUserID(r)
		if userID == "" {
			common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
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
	
	page := constants.DefaultPage
	if p, err := strconv.Atoi(r.URL.Query().Get("page")); err == nil {
		page = p
	}

	perPage := constants.DefaultPerPage
	if pp, err := strconv.Atoi(r.URL.Query().Get("per_page")); err == nil {
		perPage = pp
	}

	role := r.URL.Query().Get("role")
	search := r.URL.Query().Get("search")

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
