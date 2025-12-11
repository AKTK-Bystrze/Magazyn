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

// AnalyticsHandler handles HTTP requests for analytics endpoints
type AnalyticsHandler struct {
	service calendarservice.AnalyticsService
}

// NewAnalyticsHandler creates a new AnalyticsHandler
func NewAnalyticsHandler(s calendarservice.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{service: s}
}

// getAnalyticsUserID extracts user ID from request context
func getAnalyticsUserID(r *http.Request) string {
	user := r.Context().Value(appcontext.UserContextKey)
	if user == nil {
		return ""
	}
	if u, ok := user.(*types.User); ok {
		return u.ID
	}
	return ""
}

// HandleGetEquipmentStats handles GET /analytics/equipment-stats
func (h *AnalyticsHandler) HandleGetEquipmentStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getAnalyticsUserID(r)
	if userID == "" {
		common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse query parameters
	query := types.AnalyticsPeriodQuery{}

	if yearStr := r.URL.Query().Get("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			if year < 2000 || year > 2100 {
				common.RespondError(ctx, w, http.StatusBadRequest, "year must be between 2000 and 2100")
				return
			}
			query.Year = &year
		} else {
			common.RespondError(ctx, w, http.StatusBadRequest, "year must be a valid integer")
			return
		}
	}

	if monthStr := r.URL.Query().Get("month"); monthStr != "" {
		if month, err := strconv.Atoi(monthStr); err == nil {
			if month < 1 || month > 12 {
				common.RespondError(ctx, w, http.StatusBadRequest, "month must be between 1 and 12")
				return
			}
			query.Month = &month
		} else {
			common.RespondError(ctx, w, http.StatusBadRequest, "month must be a valid integer")
			return
		}
	}

	if equipmentID := r.URL.Query().Get("equipment_id"); equipmentID != "" {
		if len(equipmentID) != 36 {
			common.RespondError(ctx, w, http.StatusBadRequest, "equipment_id must be a valid UUID")
			return
		}
		query.EquipmentID = &equipmentID
	}

	response, err := h.service.GetEquipmentStats(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "HandleGetEquipmentStats error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleGetUserStats handles GET /analytics/user-stats
func (h *AnalyticsHandler) HandleGetUserStats(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getAnalyticsUserID(r)
	if userID == "" {
		common.RespondError(ctx, w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	// Parse query parameters
	query := types.AnalyticsPeriodQuery{}

	if yearStr := r.URL.Query().Get("year"); yearStr != "" {
		if year, err := strconv.Atoi(yearStr); err == nil {
			if year < 2000 || year > 2100 {
				common.RespondError(ctx, w, http.StatusBadRequest, "year must be between 2000 and 2100")
				return
			}
			query.Year = &year
		} else {
			common.RespondError(ctx, w, http.StatusBadRequest, "year must be a valid integer")
			return
		}
	}

	if monthStr := r.URL.Query().Get("month"); monthStr != "" {
		if month, err := strconv.Atoi(monthStr); err == nil {
			if month < 1 || month > 12 {
				common.RespondError(ctx, w, http.StatusBadRequest, "month must be between 1 and 12")
				return
			}
			query.Month = &month
		} else {
			common.RespondError(ctx, w, http.StatusBadRequest, "month must be a valid integer")
			return
		}
	}

	response, err := h.service.GetUserStats(ctx, query)
	if err != nil {
		logger.Errorf(ctx, "HandleGetUserStats error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}
