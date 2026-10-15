package validation_test

import (
	"testing"

	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/types"
	"magazyn/backend/internal/validation"

	"github.com/stretchr/testify/assert"
)

func TestValidatePagination(t *testing.T) {
	t.Run("defaults when page < 1 and perPage <= 0", func(t *testing.T) {
		page, perPage, err := validation.ValidatePagination(0, 0)
		assert.NoError(t, err)
		assert.Equal(t, constants.DefaultPage, page)
		assert.Equal(t, constants.DefaultPerPage, perPage)
	})

	t.Run("valid allowed perPage values succeed", func(t *testing.T) {
		for _, allowed := range constants.AllowedPerPageValues {
			page, perPage, err := validation.ValidatePagination(2, allowed)
			assert.NoError(t, err)
			assert.Equal(t, 2, page)
			assert.Equal(t, allowed, perPage)
		}
	})

	t.Run("disallowed perPage returns ValidationError", func(t *testing.T) {
		page, perPage, err := validation.ValidatePagination(1, 15)
		assert.Error(t, err)
		assert.IsType(t, &types.ValidationError{}, err)
		assert.Contains(t, err.Error(), "Invalid per_page value")
		assert.Equal(t, 1, page)
		assert.Equal(t, 15, perPage)
	})
}
