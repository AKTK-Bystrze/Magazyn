package credit

import (
	"net/http"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/types"
)

type CreditHistoryHandler struct {
	service credit.CreditHistoryService
}

func NewCreditHistoryHandler(service credit.CreditHistoryService) *CreditHistoryHandler {
	return &CreditHistoryHandler{service: service}
}
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
	isAdmin := userRole == auth.RoleAdmin || userRole == auth.RoleSuperAdmin
	var targetUserID *string
	if filterUserID != "" {
		if !isAdmin {
			common.RespondError(ctx, w, http.StatusForbidden, "Only admins can filter by user_id")
			return
		}
		targetUserID = &filterUserID
	}
	query := types.GetCreditHistoryQuery{
		Page:    page,
		PerPage: perPage,
		UserID:  targetUserID,
	}
	resp, err := h.service.GetCreditHistory(ctx, query, userID)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}
