package calendar

import (
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	calendarservice "magazyn/backend/internal/service/calendar"
	"magazyn/backend/internal/types"
	"net/http"
	"strconv"
)

// CalendarHandler handles HTTP requests for calendar endpoints
type CalendarHandler struct {
	service calendarservice.CalendarService
}

// NewCalendarHandler creates a new CalendarHandler
func NewCalendarHandler(s calendarservice.CalendarService) *CalendarHandler {
	return &CalendarHandler{service: s}
}

// getUserID extracts user ID from request context
func getUserID(r *http.Request) string {
	user := r.Context().Value(appcontext.UserContextKey)
	if user == nil {
		return ""
	}
	if u, ok := user.(*types.User); ok {
		return u.ID
	}
	return ""
}

// HandleGetAvailability handles GET /calendar/availability
func (h *CalendarHandler) HandleGetAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	if userID == "" {
		common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse query parameters
	query := types.CalendarAvailabilityQuery{
		Days: 30, // default
	}

	if equipmentID := r.URL.Query().Get("equipment_id"); equipmentID != "" {
		query.EquipmentID = &equipmentID
	}

	if startDate := r.URL.Query().Get("start_date"); startDate != "" {
		query.StartDate = &startDate
	}

	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if days, err := strconv.Atoi(daysStr); err == nil {
			if days < 1 {
				common.RespondError(ctx, w, http.StatusBadRequest, "days must be at least 1")
				return
			}
			if days > 90 {
				common.RespondError(ctx, w, http.StatusBadRequest, "days must not exceed 90")
				return
			}
			query.Days = days
		} else {
			common.RespondError(ctx, w, http.StatusBadRequest, "days must be a valid integer")
			return
		}
	}

	// Validate equipment_id if provided (basic UUID check)
	if query.EquipmentID != nil && *query.EquipmentID != "" {
		if len(*query.EquipmentID) != 36 {
			common.RespondError(ctx, w, http.StatusBadRequest, "equipment_id must be a valid UUID")
			return
		}
	}

	// Validate start_date format if provided
	if query.StartDate != nil && *query.StartDate != "" {
		if len(*query.StartDate) != 10 {
			common.RespondError(ctx, w, http.StatusBadRequest, "start_date must be in YYYY-MM-DD format")
			return
		}
	}

	response, err := h.service.GetCalendarAvailability(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "HandleGetAvailability error: %v", err)
		if validationErr, ok := err.(*types.ValidationError); ok {
			common.RespondError(ctx, w, http.StatusBadRequest, validationErr.Message)
			return
		}
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}
