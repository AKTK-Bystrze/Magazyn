package calendar

import (
	"fmt"
	"net/http"
	"strconv"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	calendarservice "magazyn/backend/internal/service/calendar"
	"magazyn/backend/internal/types"
)

// AnalyticsHandler handles HTTP requests for analytics endpoints.
// It exposes methods to retrieve statistical data about equipment usage and user activity.
type AnalyticsHandler struct {
	service calendarservice.AnalyticsService
}

// NewAnalyticsHandler creates a new instance of AnalyticsHandler with the given service dependency.
func NewAnalyticsHandler(s calendarservice.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{service: s}
}

// HandleGetEquipmentStats handles GET /analytics/equipment-stats.
// It retrieves equipment usage statistics, optionally filtered by year, month, or specific equipment ID.
func (h *AnalyticsHandler) HandleGetEquipmentStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}

	query, err := h.parsePeriodQuery(r)
	if err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, err.Error())
		return
	}

	response, err := h.service.GetEquipmentStats(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "HandleGetEquipmentStats error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleGetUserStats handles GET /analytics/user-stats.
// It retrieves user activity statistics, optionally filtered by year and month.
func (h *AnalyticsHandler) HandleGetUserStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}

	query, err := h.parsePeriodQuery(r)
	if err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, err.Error())
		return
	}

	response, err := h.service.GetUserStats(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "HandleGetUserStats error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// parsePeriodQuery extracts and validates year, month, and equipment_id from the request query parameters.
func (h *AnalyticsHandler) parsePeriodQuery(r *http.Request) (types.AnalyticsPeriodQuery, error) {
	query := types.AnalyticsPeriodQuery{}
	q := r.URL.Query()

	if yearStr := q.Get("year"); yearStr != "" {
		year, err := strconv.Atoi(yearStr)
		if err != nil {
			return query, fmt.Errorf("year must be a valid integer")
		}
		if year < constants.AnalyticsMinYear || year > constants.AnalyticsMaxYear {
			return query, fmt.Errorf("year must be between %d and %d", constants.AnalyticsMinYear, constants.AnalyticsMaxYear)
		}
		query.Year = &year
	}

	if monthStr := q.Get("month"); monthStr != "" {
		month, err := strconv.Atoi(monthStr)
		if err != nil {
			return query, fmt.Errorf("month must be a valid integer")
		}
		if month < constants.MinMonth || month > constants.MaxMonth {
			return query, fmt.Errorf("month must be between %d and %d", constants.MinMonth, constants.MaxMonth)
		}
		query.Month = &month
	}

	if equipmentID := q.Get("equipment_id"); equipmentID != "" {
		if len(equipmentID) != constants.UUIDLength {
			return query, fmt.Errorf("equipment_id must be a valid UUID")
		}
		query.EquipmentID = &equipmentID
	}

	return query, nil
}
