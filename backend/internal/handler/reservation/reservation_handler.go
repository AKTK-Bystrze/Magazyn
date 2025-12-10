package reservation

// Package reservation implements the HTTP handlers for the reservation API.
// It maps HTTP requests to service calls and formats responses.

import (
	"encoding/json"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/types"
	"net/http"
	"strconv"
)

// ReservationHandler handles HTTP requests for reservation resources.
type ReservationHandler struct {
	service reservation.ReservationService
}

// NewReservationHandler creates a new instance of ReservationHandler.
func NewReservationHandler(s reservation.ReservationService) *ReservationHandler {
	return &ReservationHandler{service: s}
}

// Helpers
func getUser(r *http.Request) *types.User {
	val := r.Context().Value(appcontext.UserContextKey)
	if val == nil {
		return nil
	}
	if u, ok := val.(*types.User); ok {
		return u
	}
	// Fallback/Safety
	return nil
}

func getProfile(r *http.Request) *types.PublicProfilesSelect {
	val := r.Context().Value(appcontext.UserProfileContextKey)
	if val == nil {
		return nil
	}
	if p, ok := val.(*types.PublicProfilesSelect); ok {
		return p
	}
	return nil
}

func getUserID(r *http.Request) string {
	u := getUser(r)
	if u == nil {
		return ""
	}
	return u.ID
}

func getUserRole(r *http.Request) string {
	p := getProfile(r)
	if p == nil {
		return ""
	}
	return p.Role
}

// HandleList GET /reservations
func (h *ReservationHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	role := getUserRole(r)
	
	if userID == "" {
		common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	query := types.ReservationListQuery{}

	if page := r.URL.Query().Get("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil {
			query.Page = p
		}
	} else {
		query.Page = constants.DefaultPage
	}

	if perPage := r.URL.Query().Get("per_page"); perPage != "" {
		if pp, err := strconv.Atoi(perPage); err == nil {
			query.PerPage = pp
		}
	} else {
		query.PerPage = constants.DefaultPerPage
	}

	if status := r.URL.Query().Get("status"); status != "" {
		query.Status = &status
	}
	if qUserID := r.URL.Query().Get("user_id"); qUserID != "" {
		// Only admin can filter by other user ID
		if role == "admin" || role == "super_admin" {
			query.UserID = &qUserID
		} else {
			// Ignore or enforce own ID? 
			// We enforce own ID for non-admins below usually.
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

	// Enforce non-admin can only see own
	if role != "admin" && role != "super_admin" {
		query.UserID = &userID
	}

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
	userID := getUserID(r)
	role := getUserRole(r)
	id := r.PathValue("id")

	if userID == "" {
		common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
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
	userID := getUserID(r)
	
	if userID == "" {
		common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
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
	userID := getUserID(r)
	role := getUserRole(r)
	id := r.PathValue("id")

	if userID == "" {
		common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "ID request")
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
	role := getUserRole(r)
	
	if role != "admin" && role != "super_admin" {
		common.RespondError(ctx, w, http.StatusForbidden, "Admin access only")
		return
	}

	var cmd types.BulkUpdateReservationsCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}

	err := h.service.BulkUpdate(ctx, cmd)
	if err != nil {
		logger.Errorf(ctx, "BulkUpdate error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, err.Error())
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, map[string]string{"message": "Bulk update successful"})
}

// HandleDashboardStats GET /reservations/dashboard
func (h *ReservationHandler) HandleDashboardStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	role := getUserRole(r)
	
	if role != "admin" && role != "super_admin" {
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
