package credit

import (
	"encoding/json"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/types"
	"net/http"
)

type CreditRequestHandler struct {
	service credit.CreditRequestService
}

func NewCreditRequestHandler(service credit.CreditRequestService) *CreditRequestHandler {
	return &CreditRequestHandler{service: service}
}
func (h *CreditRequestHandler) HandleListRequests(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	page, perPage := common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)
	resp, err := h.service.ListRequests(ctx, page, perPage)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}
func (h *CreditRequestHandler) HandleCreateRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	var req types.CreateCreditRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}
	if req.Title == "" || req.CreditsValue <= 0 || req.UserHelpedID == "" || len(req.Helpers) == 0 {
		common.RespondError(ctx, w, http.StatusBadRequest, "Missing or invalid required fields")
		return
	}
	resp, err := h.service.CreateRequest(ctx, userID, req)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusCreated, resp)
}
func (h *CreditRequestHandler) HandleUpdateRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	id := r.PathValue("id")
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "ID is required")
		return
	}
	var req types.UpdateCreditRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}
	resp, err := h.service.UpdateRequest(ctx, userID, id, req)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}
func (h *CreditRequestHandler) HandleReviewRequest(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	userRole := common.GetUserRoleFromContext(r)
	if userRole != auth.RoleSuperAdmin {
		common.RespondError(ctx, w, http.StatusForbidden, "Only super admin can review requests")
		return
	}
	id := r.PathValue("id")
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "ID is required")
		return
	}
	var req types.ReviewCreditRequestDTO
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}
	err := h.service.ReviewRequest(ctx, userID, id, req)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, map[string]string{"message": "Status updated successfully"})
}
func (h *CreditRequestHandler) HandleGetLeaderboard(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}
	resp, err := h.service.GetLeaderboard(ctx)
	if err != nil {
		common.RespondWithError(ctx, w, err)
		return
	}
	common.RespondJSON(ctx, w, http.StatusOK, resp)
}
