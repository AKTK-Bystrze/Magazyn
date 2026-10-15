package validation

import (
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
)

// ValidatePagination normalizes page and perPage parameters and ensures perPage is in constants.AllowedPerPageValues.
// If page < 1, constants.DefaultPage is returned.
// If perPage <= 0, constants.DefaultPerPage is returned.
// Returns a *types.ValidationError if perPage is not an allowed value.
func ValidatePagination(page, perPage int) (int, int, error) {
	if page < 1 {
		page = constants.DefaultPage
	}
	if perPage <= 0 {
		perPage = constants.DefaultPerPage
	}
	isAllowed := false
	for _, val := range constants.AllowedPerPageValues {
		if perPage == val {
			isAllowed = true
			break
		}
	}
	if !isAllowed {
		return page, perPage, types.NewValidationError("Invalid per_page value. Allowed: 10, 25, 50, 100", map[string]int{"per_page": perPage})
	}
	return page, perPage, nil
}
