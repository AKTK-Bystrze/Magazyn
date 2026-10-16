package reservation

import (
	"net/http"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

func parseReservationListQuery(r *http.Request) (types.ReservationListQuery, error) {
	query := types.ReservationListQuery{}
	query.Page, query.PerPage = common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)
	if status := r.URL.Query().Get("status"); status != "" {
		if err := validation.ValidateEnum(status, constants.ValidReservationStatuses); err != nil {
			return query, types.NewValidationError("Invalid reservation status", nil)
		}
		query.Status = &status
	}
	if qUserID := r.URL.Query().Get("user_id"); qUserID != "" {
		if err := validation.ValidateUUID(qUserID); err != nil {
			return query, types.NewValidationError("Invalid user_id format", nil)
		}
		query.UserID = &qUserID
	}
	if eqID := r.URL.Query().Get("equipment_id"); eqID != "" {
		if err := validation.ValidateUUID(eqID); err != nil {
			return query, types.NewValidationError("Invalid equipment_id format", nil)
		}
		query.EquipmentID = &eqID
	}
	if typeID := r.URL.Query().Get("type_id"); typeID != "" {
		if err := validation.ValidateUUID(typeID); err != nil {
			return query, types.NewValidationError("Invalid type_id format", nil)
		}
		query.TypeID = &typeID
	}
	if search := r.URL.Query().Get("search"); search != "" {
		if err := validation.ValidateStringLength(search, 0, constants.MaxSearchLength); err != nil {
			return query, types.NewValidationError("Search term too long (max 100 characters)", nil)
		}
		query.Search = &search
	}
	if sort := r.URL.Query().Get("sort"); sort != "" {
		if err := validation.ValidateEnum(sort, constants.ValidReservationSorts); err != nil {
			return query, types.NewValidationError("Invalid sort option", nil)
		}
		query.Sort = &sort
	}
	if start := r.URL.Query().Get("start_date_from"); start != "" {
		query.StartDateFrom = &start
	}
	if end := r.URL.Query().Get("start_date_to"); end != "" {
		query.StartDateTo = &end
	}
	if scope := r.URL.Query().Get("scope"); scope != "" {
		if scope != "all" && scope != "my" {
			return query, types.NewValidationError("Invalid scope: must be 'all' or 'my'", nil)
		}
		query.Scope = &scope
	}
	return query, nil
}
