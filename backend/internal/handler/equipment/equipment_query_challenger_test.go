package equipment

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"magazyn/backend/internal/constants"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdversarial_ParseEquipmentListQuery(t *testing.T) {
	t.Run("default pagination when no query params", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment", nil)
		query, err := parseEquipmentListQuery(req)
		require.NoError(t, err)
		assert.Equal(t, constants.DefaultPage, query.Page)
		assert.Equal(t, constants.DefaultPerPage, query.PerPage)
		assert.Nil(t, query.TypeID)
		assert.Nil(t, query.Status)
		assert.Nil(t, query.Search)
		assert.False(t, query.IncludeArchived)
		assert.Nil(t, query.AvailableFrom)
		assert.Nil(t, query.AvailableTo)
	})

	t.Run("valid filters all present", func(t *testing.T) {
		validUUID := "123e4567-e89b-12d3-a456-426614174000"
		search100 := strings.Repeat("x", 100)
		url := "/equipment?page=2&per_page=10&type_id=" + validUUID +
			"&status=ok&search=" + search100 +
			"&include_archived=true&available_from=2026-10-15&available_to=2026-10-20"
		req := httptest.NewRequest(http.MethodGet, url, nil)
		query, err := parseEquipmentListQuery(req)
		require.NoError(t, err)
		assert.Equal(t, 2, query.Page)
		assert.Equal(t, 10, query.PerPage)
		require.NotNil(t, query.TypeID)
		assert.Equal(t, validUUID, *query.TypeID)
		require.NotNil(t, query.Status)
		assert.Equal(t, "ok", *query.Status)
		require.NotNil(t, query.Search)
		assert.Equal(t, search100, *query.Search)
		assert.True(t, query.IncludeArchived)
		require.NotNil(t, query.AvailableFrom)
		assert.Equal(t, "2026-10-15", *query.AvailableFrom)
		require.NotNil(t, query.AvailableTo)
		assert.Equal(t, "2026-10-20", *query.AvailableTo)
	})

	t.Run("invalid type_id returns validation error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment?type_id=not-a-uuid", nil)
		_, err := parseEquipmentListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid type_id format")
	})

	t.Run("invalid status enum returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment?status=INVALID_STATUS", nil)
		_, err := parseEquipmentListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid equipment status")
	})

	t.Run("search term exceeding max length returns error", func(t *testing.T) {
		search101 := strings.Repeat("x", 101)
		req := httptest.NewRequest(http.MethodGet, "/equipment?search="+search101, nil)
		_, err := parseEquipmentListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Search term too long")
	})

	t.Run("available_from without available_to returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment?available_from=2026-10-15", nil)
		_, err := parseEquipmentListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Both available_from and available_to must be provided together")
	})

	t.Run("available_to without available_from returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment?available_to=2026-10-20", nil)
		_, err := parseEquipmentListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Both available_from and available_to must be provided together")
	})

	t.Run("invalid available_from date format returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment?available_from=2026/10/15&available_to=2026-10-20", nil)
		_, err := parseEquipmentListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid available_from date format")
	})

	t.Run("invalid available_to date format returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment?available_from=2026-10-15&available_to=2026/10/20", nil)
		_, err := parseEquipmentListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid available_to date format")
	})

	t.Run("available_from after available_to returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment?available_from=2026-10-25&available_to=2026-10-20", nil)
		_, err := parseEquipmentListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "available_from must be before or equal to available_to")
	})

	t.Run("available_from equals available_to succeeds", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/equipment?available_from=2026-10-20&available_to=2026-10-20", nil)
		query, err := parseEquipmentListQuery(req)
		require.NoError(t, err)
		assert.Equal(t, "2026-10-20", *query.AvailableFrom)
		assert.Equal(t, "2026-10-20", *query.AvailableTo)
	})
}
