package reservation

// Package reservation implements the HTTP handlers for the reservation API.
// It maps HTTP requests to service calls and formats responses.

import (
	"encoding/json"
	"net/http"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/types"
)

// ReservationHandler handles HTTP requests for reservation resources.
type ReservationHandler struct {
	service reservation.ReservationService
}

// NewReservationHandler creates a new instance of ReservationHandler.
func NewReservationHandler(s reservation.ReservationService) *ReservationHandler {
	return &ReservationHandler{service: s}
}

// HandleList GET /reservations
func (h *ReservationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	role := common.GetUserRoleFromContext(r)

	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}

	query := types.ReservationListQuery{}

	query.Page, query.PerPage = common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)

	if status := r.URL.Query().Get("status"); status != "" {
		query.Status = &status
	}
	if qUserID := r.URL.Query().Get("user_id"); qUserID != "" {
		// Only admin can filter by other user ID
		if role == auth.RoleAdmin || role == auth.RoleSuperAdmin {
			query.UserID = &qUserID
		}
	}
	if eqID := r.URL.Query().Get("equipment_id"); eqID != "" {
		query.EquipmentID = &eqID
	}
	if start := r.URL.Query().Get("start_date_from"); start != "" {
		query.StartDateFrom = &start
	}
	if end := r.URL.Query().Get("start_date_to"); end != "" {
		query.StartDateTo = &end
	}

	// Check scope parameter for filtering
	scope := r.URL.Query().Get("scope")

	logger.Debugf(ctx, "Reservations list - Role: %s, Scope: %s, UserID: %s", role, scope, userID)

	// Apply ownership filter based on scope
	// scope="all" → show all reservations (any authenticated user)
	// scope="my" or empty → show only user's own reservations
	if scope == "all" {
		// Bypass RLS to allow seeing all reservations
		query.BypassRLS = true
	} else {
		query.UserID = &userID
	}

	logger.Debugf(ctx, "Reservations list - query.UserID: %v, BypassRLS: %v", query.UserID, query.BypassRLS)

	response, err := h.service.List(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "List error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleGetByID GET /reservations/{id}
func (h *ReservationHandler) HandleGetByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	role := common.GetUserRoleFromContext(r)
	id := r.PathValue("id")

	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "ID is required")
		return
	}

	response, err := h.service.GetByID(ctx, id, userID, role)
	if err != nil {
		if _, ok := err.(*types.NotFoundError); ok {
			common.RespondError(ctx, w, http.StatusNotFound, "Reservation not found")
			return
		}
		if _, ok := err.(*types.ForbiddenError); ok {
			common.RespondError(ctx, w, http.StatusForbidden, err.Error())
			return
		}
		logger.Errorf(ctx, "GetByID error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleCreate POST /reservations
func (h *ReservationHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)

	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}

	var cmd types.CreateReservationsCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validation manual check (or use validator library if available in project)
	if len(cmd.Reservations) == 0 {
		common.RespondError(ctx, w, http.StatusBadRequest, "No reservations provided")
		return
	}

	response, err := h.service.Create(ctx, cmd, userID)
	if err != nil {
		if _, ok := err.(*types.ConflictError); ok {
			common.RespondError(ctx, w, http.StatusConflict, err.Error())
			return
		}
		if _, ok := err.(*types.ValidationError); ok {
			common.RespondError(ctx, w, http.StatusBadRequest, err.Error())
			return
		}
		logger.Errorf(ctx, "Create error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, err.Error())
		return
	}

	common.RespondJSON(ctx, w, http.StatusCreated, response)
}

// HandleUpdate PATCH /reservations/{id}
func (h *ReservationHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	role := common.GetUserRoleFromContext(r)
	id := r.PathValue("id")

	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "ID is required")
		return
	}

	var cmd types.UpdateReservationCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}

	response, err := h.service.Update(ctx, id, cmd, userID, role)
	if err != nil {
		if _, ok := err.(*types.NotFoundError); ok {
			common.RespondError(ctx, w, http.StatusNotFound, "Reservation not found")
			return
		}
		if _, ok := err.(*types.ForbiddenError); ok {
			common.RespondError(ctx, w, http.StatusForbidden, err.Error())
			return
		}
		if _, ok := err.(*types.ConflictError); ok {
			common.RespondError(ctx, w, http.StatusConflict, err.Error())
			return
		}
		logger.Errorf(ctx, "Update error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, err.Error())
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleBulkUpdate PATCH /reservations/bulk
func (h *ReservationHandler) HandleBulkUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	role := common.GetUserRoleFromContext(r)

	if role != auth.RoleAdmin && role != auth.RoleSuperAdmin {
		common.RespondError(ctx, w, http.StatusForbidden, "Admin access only")
		return
	}

	var cmd types.BulkUpdateReservationsCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}

	adminID := common.GetUserIDFromContext(r)
	response, err := h.service.BulkUpdate(ctx, cmd, adminID)
	if err != nil {
		logger.Errorf(ctx, "BulkUpdate error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, err.Error())
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleDashboardStats GET /reservations/dashboard
func (h *ReservationHandler) HandleDashboardStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	role := common.GetUserRoleFromContext(r)

	if role != auth.RoleAdmin && role != auth.RoleSuperAdmin {
		common.RespondError(ctx, w, http.StatusForbidden, "Admin access only")
		return
	}

	response, err := h.service.GetDashboardStats(ctx)
	if err != nil {
		logger.Errorf(ctx, "DashboardStats error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}
