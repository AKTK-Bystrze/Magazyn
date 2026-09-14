package credit

import (
	"context"
	"errors"
	"net/http"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/types"
)

// CreditHistoryHandler handles HTTP requests for credit history.
type CreditHistoryHandler struct {
	service credit.CreditHistoryService
}

// NewCreditHistoryHandler creates a new instance of CreditHistoryHandler.
func NewCreditHistoryHandler(service credit.CreditHistoryService) *CreditHistoryHandler {
	return &CreditHistoryHandler{service: service}
}

// HandleGetCreditHistory handles GET /credit-history.
func (h *CreditHistoryHandler) HandleGetCreditHistory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// 1. Authentication & Role Extraction
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	userRole := common.GetUserRoleFromContext(r)

	page, perPage := common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)
	filterUserID := r.URL.Query().Get("user_id")

	// 3. Authorization Check for Filtering
	// Regular users cannot use user_id filter.
	isAdmin := userRole == auth.RoleAdmin || userRole == auth.RoleSuperAdmin
	var targetUserID *string

	if filterUserID != "" {
		if !isAdmin {
			common.RespondError(ctx, w, http.StatusForbidden, "Only admins can filter by user_id")
			return
		}
		targetUserID = &filterUserID
	}

	// 4. Build Query
	query := types.GetCreditHistoryQuery{
		Page:    page,
		PerPage: perPage,
		UserID:  targetUserID,
	}

	// 5. Call Service
	resp, err := h.service.GetCreditHistory(ctx, query, userID)
	if err != nil {
		handleError(ctx, w, err)
		return
	}

	// 6. Respond
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}

// handleError helper to map service errors to HTTP responses
func handleError(ctx context.Context, w http.ResponseWriter, err error) {
	var notFound *types.NotFoundError
	var conflict *types.ConflictError
	var validation *types.ValidationError
	var forbidden *types.ForbiddenError

	switch {
	case errors.As(err, &notFound):
		common.RespondError(ctx, w, http.StatusNotFound, err.Error())
	case errors.As(err, &conflict):
		common.RespondError(ctx, w, http.StatusConflict, err.Error())
	case errors.As(err, &validation):
		common.RespondError(ctx, w, http.StatusBadRequest, err.Error())
	case errors.As(err, &forbidden):
		common.RespondError(ctx, w, http.StatusForbidden, err.Error())
	default:
		logger.Errorf(ctx, "Internal server error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
	}
}
