package credit

import (
	"context"
	"errors"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/types"
	"net/http"
	"strconv"
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

	// 2. Parse Query Parameters
	// ParsePagination handles defaults, but we need raw values or specific logic to pass to service
	// which has strict validation.
	// If we use common.ParsePagination, it sets defaults for us if missing/invalid.
	// But service wants to throw error if invalid allowed value.
	// So we should parse manually to differentiate "missing" vs "invalid".
	
	pageStr := r.URL.Query().Get("page")
	perPageStr := r.URL.Query().Get("per_page")
	filterUserID := r.URL.Query().Get("user_id")

	page := constants.DefaultPage
	if pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil {
			page = p
		} else {
			// If not integer, service will handle or we can error here.
			// Let's pass it as is (if we could) or just let service handle validation of logic values.
			// Since we pass int, we must convert here. If conversion fails, it's bad request.
			common.RespondError(ctx, w, http.StatusBadRequest, "Page must be a number")
			return
		}
	}

	perPage := constants.DefaultPerPage
	if perPageStr != "" {
		if pp, err := strconv.Atoi(perPageStr); err == nil {
			perPage = pp
		} else {
			common.RespondError(ctx, w, http.StatusBadRequest, "PerPage must be a number")
			return
		}
	}

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
