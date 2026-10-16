// Package reservation provides HTTP handlers for reservation management.
package reservation

import (
	"encoding/json"
	"net/http"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

// ReservationHandler handles HTTP endpoints for reservations.
type ReservationHandler struct {
	service reservation.ReservationService
}

// NewReservationHandler creates a new instance of ReservationHandler.
func NewReservationHandler(s reservation.ReservationService) *ReservationHandler {
	return &ReservationHandler{service: s}
}

// HandleList lists reservations with optional filtering and scope.
func (h *ReservationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	role := common.GetUserRoleFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	query, err := parseReservationListQuery(r)
	if err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, err.Error())
		return
	}
	logger.Debugf(ctx, "Reservations list - Role: %s, Scope: %v, UserID: %s", role, query.Scope, userID)
	response, err := h.service.List(ctx, query, userID, role)
	if err != nil {
		logger.Errorf(ctx, "List error: %v", err)
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleGetByID retrieves detailed information for a single reservation.
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
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleCreate creates one or more equipment reservations.
func (h *ReservationHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	role := common.GetUserRoleFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	var cmd types.CreateReservationsCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if len(cmd.Reservations) == 0 {
		common.RespondError(ctx, w, http.StatusBadRequest, "No reservations provided")
		return
	}
	response, err := h.service.Create(ctx, cmd, userID, role)
	if err != nil {
		logger.Errorf(ctx, "Create error: %v", err)
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusCreated, response)
}

// HandleUpdate updates reservation dates or status.
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
	if cmd.Status != nil && *cmd.Status != "" {
		if err := validation.ValidateEnum(*cmd.Status, constants.ValidReservationStatuses); err != nil {
			common.RespondError(ctx, w, http.StatusBadRequest, "Invalid reservation status")
			return
		}
	}
	response, err := h.service.Update(ctx, id, cmd, userID, role)
	if err != nil {
		logger.Errorf(ctx, "Update error: %v", err)
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, response)
}
