package validation

import (
	"slices"

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
	if !slices.Contains(constants.AllowedPerPageValues, perPage) {
		return page, perPage, types.NewValidationError("Invalid per_page value. Allowed: 10, 25, 50, 100", map[string]int{"per_page": perPage})
	}
	return page, perPage, nil
}

// CalculateTotalPages calculates the total number of pages from total items and perPage.
func CalculateTotalPages(total int64, perPage int) int {
	if total <= 0 || perPage <= 0 {
		return 0
	}
	return int((total + int64(perPage) - 1) / int64(perPage))
}
