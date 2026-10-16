package equipment

import (
	"encoding/json"
	"net/http"

	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/types"
)

// HandleCreateMaintenanceLog records a maintenance or service event for an equipment item.
func (h *EquipmentHandler) HandleCreateMaintenanceLog(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	id := r.PathValue("id")
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "Equipment ID is required")
		return
	}
	var cmd types.CreateMaintenanceLogCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}
	response, err := h.service.CreateMaintenanceLog(ctx, id, cmd.Notes, userID)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusCreated, response)
}
