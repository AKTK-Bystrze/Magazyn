package reservation

import (
	"encoding/json"
	"net/http"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

// HandleBulkUpdate updates status for multiple reservations (admin only).
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
	if err := validation.ValidateEnum(cmd.Status, constants.ValidReservationStatuses); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid reservation status")
		return
	}
	adminID := common.GetUserIDFromContext(r)
	response, err := h.service.BulkUpdate(ctx, cmd, adminID)
	if err != nil {
		logger.Errorf(ctx, "BulkUpdate error: %v", err)
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleDashboardStats returns aggregated reservation statistics for dashboard (admin only).
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
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, response)
}
