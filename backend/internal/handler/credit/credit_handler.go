// Package credit provides HTTP handlers for credit history and credit request management.
package credit

import (
	"net/http"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/types"
)

// CreditHistoryHandler handles HTTP endpoints for retrieving user credit history.
type CreditHistoryHandler struct {
	service credit.CreditHistoryService
}

// NewCreditHistoryHandler creates a new instance of CreditHistoryHandler.
func NewCreditHistoryHandler(service credit.CreditHistoryService) *CreditHistoryHandler {
	return &CreditHistoryHandler{service: service}
}

// HandleGetCreditHistory retrieves paginated credit history records for the requesting user or target user.
func (h *CreditHistoryHandler) HandleGetCreditHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	userRole := common.GetUserRoleFromContext(r)
	page, perPage := common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)
	filterUserID := r.URL.Query().Get("user_id")
	var targetUserID *string
	if filterUserID != "" {
		targetUserID = &filterUserID
	}
	query := types.GetCreditHistoryQuery{
		Page:    page,
		PerPage: perPage,
		UserID:  targetUserID,
	}
	resp, err := h.service.GetCreditHistory(ctx, query, userID, userRole)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}
