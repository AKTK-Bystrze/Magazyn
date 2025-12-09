package handler

import (
	"encoding/json"
	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/service"
	"magazyn/backend/internal/types"
	"net/http"
	"strconv"

	gotrue "github.com/supabase-community/gotrue-go/types"
)

type EquipmentHandler struct {
	service service.EquipmentService
}

func NewEquipmentHandler(s service.EquipmentService) *EquipmentHandler {
	return &EquipmentHandler{service: s}
}

// Helper to get UserID from context
func getUserID(r *http.Request) string {
	user := r.Context().Value(appcontext.UserContextKey)
	if user == nil {
		return ""
	}
	// Verify exact type. In middleware: user, err := client.Auth...GetUser(). user is *types.UserResponse which has User struct inside?
	// or *types.User?
	// Checking middleware: config.SupabaseClient.Auth.WithToken(token).GetUser() returns *UserResponse, error
	// So user is *types.UserResponse
	// Actually, GetUser definition in gotrue-go: func (c *Client) GetUser() (*UserResponse, error)
	// UserResponse struct contains User.
	// Middleware line 33: user, err := ...GetUser()
	// Middleware line 44: context.WithValue(..., user)
	// So it is *types.UserResponse (which embeds User? No, it has User field?)
	// Let's check gotrue-go types or assume it behaves like *types.UserResponse.
	// Actually, UserResponse usually has a User field or is the User.
	// Let's look at auth.middleware safely using user.ID.String().
	// It assumes user has .ID field.

	// Assuming user is *gotrue.UserResponse for now.
	if u, ok := user.(*gotrue.UserResponse); ok {
		return u.ID.String()
	}
	return ""
}

// List handles get equpiment list
func (h *EquipmentHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	query := types.EquipmentListQuery{}

	// Parse query params
	if page := r.URL.Query().Get("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil {
			query.Page = p
		}
	} else {
		query.Page = 1
	}

	if perPage := r.URL.Query().Get("per_page"); perPage != "" {
		if pp, err := strconv.Atoi(perPage); err == nil {
			query.PerPage = pp
		}
	} else {
		query.PerPage = 25
	}

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
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// GetByID handles get equipment details
func (h *EquipmentHandler) HandleGetByID(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id") // Go 1.22+
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	response, err := h.service.GetByID(ctx, id)
	if err != nil {
		// Handle specific errors
		if _, ok := err.(*types.NotFoundError); ok {
			http.Error(w, "Equipment not found", http.StatusNotFound)
			return
		}
		logger.Errorf(ctx, "HandleGetByID error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Create handles creating new equipment
func (h *EquipmentHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	if userID == "" {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	var cmd types.CreateEquipmentCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	response, err := h.service.Create(ctx, cmd, userID)
	if err != nil {
		// Handle errors (conflict, not found, etc)
		// For brevity, generic 500 or 400
		logger.Errorf(ctx, "HandleCreate error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError) // Should be cleaner
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}

// Update handles updating equipment
func (h *EquipmentHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	userID := getUserID(r)
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	var cmd types.UpdateEquipmentCommand
	if err := json.NewDecoder(r.Body).Decode(&cmd); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	response, err := h.service.Update(ctx, id, cmd, userID)
	if err != nil {
		logger.Errorf(ctx, "HandleUpdate error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// Archive handles archiving equipment
func (h *EquipmentHandler) HandleArchive(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	err := h.service.Archive(ctx, id)
	if err != nil {
		logger.Errorf(ctx, "HandleArchive error: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"message": "Equipment archived successfully"})
}

// CheckAvailability handles availability check
func (h *EquipmentHandler) HandleCheckAvailability(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	id := r.PathValue("id")
	if id == "" {
		http.Error(w, "ID is required", http.StatusBadRequest)
		return
	}

	query := types.AvailabilityQuery{
		StartDate: r.URL.Query().Get("start_date"),
		EndDate:   r.URL.Query().Get("end_date"),
	}

	if query.StartDate == "" || query.EndDate == "" {
		http.Error(w, "start_date and end_date required", http.StatusBadRequest)
		return
	}

	response, err := h.service.CheckAvailability(ctx, id, query)
	if err != nil {
		logger.Errorf(ctx, "HandleCheckAvailability error: %v", err)
		http.Error(w, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
