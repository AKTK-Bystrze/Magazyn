package equipment

import (
	"net/http"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/handler/common"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"
)

func parseEquipmentListQuery(r *http.Request) (types.EquipmentListQuery, error) {
	query := types.EquipmentListQuery{}
	query.Page, query.PerPage = common.ParsePagination(r, constants.DefaultPage, constants.DefaultPerPage)
	if typeID := r.URL.Query().Get("type_id"); typeID != "" {
		if err := validation.ValidateUUID(typeID); err != nil {
			return query, types.NewValidationError("Invalid type_id format", nil)
		}
		query.TypeID = &typeID
	}
	if status := r.URL.Query().Get("status"); status != "" {
		if err := validation.ValidateEnum(status, constants.ValidEquipmentStatuses); err != nil {
			return query, types.NewValidationError("Invalid equipment status", nil)
		}
		query.Status = &status
	}
	if search := r.URL.Query().Get("search"); search != "" {
		if err := validation.ValidateStringLength(search, 0, constants.MaxSearchLength); err != nil {
			return query, types.NewValidationError("Search term too long (max 100 characters)", nil)
		}
		query.Search = &search
	}
	if inc := r.URL.Query().Get("include_archived"); inc == "true" {
		query.IncludeArchived = true
	}
	if availFrom := r.URL.Query().Get("available_from"); availFrom != "" {
		query.AvailableFrom = &availFrom
	}
	if availTo := r.URL.Query().Get("available_to"); availTo != "" {
		query.AvailableTo = &availTo
	}
	if (query.AvailableFrom != nil) != (query.AvailableTo != nil) {
		return query, types.NewValidationError("Both available_from and available_to must be provided together", nil)
	}
	if query.AvailableFrom != nil && query.AvailableTo != nil {
		if err := validation.ValidateISODate(*query.AvailableFrom); err != nil {
			return query, types.NewValidationError("Invalid available_from date format, expected YYYY-MM-DD", nil)
		}
		if err := validation.ValidateISODate(*query.AvailableTo); err != nil {
			return query, types.NewValidationError("Invalid available_to date format, expected YYYY-MM-DD", nil)
		}
		if *query.AvailableFrom > *query.AvailableTo {
			return query, types.NewValidationError("available_from must be before or equal to available_to", nil)
		}
	}
	return query, nil
}
