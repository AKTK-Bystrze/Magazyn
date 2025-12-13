package equipment

import (
	"encoding/json"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/logger"
	equipmentservice "magazyn/backend/internal/service/equipment"
	"magazyn/backend/internal/types"
	"net/http"
)

type EquipmentHandler struct {
	service equipmentservice.EquipmentService
}

func NewEquipmentHandler(s equipmentservice.EquipmentService) *EquipmentHandler {
	return &EquipmentHandler{service: s}
}

// List handles get equpiment list
func (h *EquipmentHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}

	query := types.EquipmentListQuery{}

	// Parse query params
	query.Page, query.PerPage = common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)

	if typeID := r.URL.Query().Get("type_id"); typeID != "" {
		query.TypeID = &typeID
	}
	if status := r.URL.Query().Get("status"); status != "" {
		query.Status = &status
	}
	if search := r.URL.Query().Get("search"); search != "" {
		query.Search = &search
	}
	if inc := r.URL.Query().Get("include_archived"); inc == "true" {
		query.IncludeArchived = true
	}

	response, err := h.service.List(ctx, userID, query)
	if err != nil {
		logger.Errorf(ctx, "HandleList error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// GetByID handles get equipment details
func (h *EquipmentHandler) HandleGetByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id") // Go 1.22+
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "ID is required")
		return
	}

	response, err := h.service.GetByID(ctx, id)
	if err != nil {
		// Handle specific errors
		if _, ok := err.(*types.NotFoundError); ok {
			common.RespondError(ctx, w, http.StatusNotFound, "Equipment not found")
			return
		}
		logger.Errorf(ctx, "HandleGetByID error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// Create handles creating new equipment
func (h *EquipmentHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}

	var cmd types.CreateEquipmentCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}

	response, err := h.service.Create(ctx, cmd, userID)
	if err != nil {
		// Handle errors (conflict, not found, etc)
		// For brevity, generic 500 or 400
		logger.Errorf(ctx, "HandleCreate error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, err.Error()) // Should be cleaner
		return
	}

	common.RespondJSON(ctx, w, http.StatusCreated, response)
}

// Update handles updating equipment
func (h *EquipmentHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
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

	var cmd types.UpdateEquipmentCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}

	response, err := h.service.Update(ctx, id, cmd, userID)
	if err != nil {
		logger.Errorf(ctx, "HandleUpdate error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, err.Error())
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// Archive handles archiving equipment
func (h *EquipmentHandler) HandleArchive(w http.ResponseWriter, r *http.Request) {
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

	err := h.service.Archive(ctx, id)
	if err != nil {
		logger.Errorf(ctx, "HandleArchive error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, err.Error())
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, map[string]string{"message": "Equipment archived successfully"})
}

// CheckAvailability handles availability check
func (h *EquipmentHandler) HandleCheckAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "ID is required")
		return
	}

	query := types.AvailabilityQuery{
		StartDate: r.URL.Query().Get("start_date"),
		EndDate:   r.URL.Query().Get("end_date"),
	}

	if query.StartDate == "" || query.EndDate == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "start_date and end_date required")
		return
	}

	response, err := h.service.CheckAvailability(ctx, id, query)
	if err != nil {
		logger.Errorf(ctx, "HandleCheckAvailability error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleListEquipmentTypes handles listing equipment types
func (h *EquipmentHandler) HandleListEquipmentTypes(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}

	response, err := h.service.ListEquipmentTypes(ctx)
	if err != nil {
		logger.Errorf(ctx, "HandleListEquipmentTypes error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, "Internal Server Error")
		return
	}

	common.RespondJSON(ctx, w, http.StatusOK, response)
}

// HandleCreateEquipmentType handles creating new equipment type
func (h *EquipmentHandler) HandleCreateEquipmentType(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := common.GetUserIDFromContext(r)
	if userID == "" {
		common.RespondUnauthorized(ctx, w)
		return
	}

	var cmd types.CreateEquipmentTypeRequest
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		common.RespondError(ctx, w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validation (simple check)
	if cmd.Name == "" {
		common.RespondError(ctx, w, http.StatusBadRequest, "Name is required")
		return
	}

	response, err := h.service.CreateEquipmentType(ctx, cmd)
	if err != nil {
		logger.Errorf(ctx, "HandleCreateEquipmentType error: %v", err)
		common.RespondError(ctx, w, http.StatusInternalServerError, err.Error())
		return
	}

	common.RespondJSON(ctx, w, http.StatusCreated, response)
}
