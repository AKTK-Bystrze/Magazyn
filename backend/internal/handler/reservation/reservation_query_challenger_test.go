package reservation

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"magazyn/backend/internal/constants"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAdversarial_ParseReservationListQuery(t *testing.T) {
	t.Run("default pagination when empty query", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/reservations", nil)
		query, err := parseReservationListQuery(req)
		require.NoError(t, err)
		assert.Equal(t, constants.DefaultPage, query.Page)
		assert.Equal(t, constants.DefaultPerPage, query.PerPage)
		assert.Nil(t, query.Status)
		assert.Nil(t, query.UserID)
		assert.Nil(t, query.EquipmentID)
		assert.Nil(t, query.TypeID)
		assert.Nil(t, query.Search)
		assert.Nil(t, query.Sort)
		assert.Nil(t, query.StartDateFrom)
		assert.Nil(t, query.StartDateTo)
		assert.Nil(t, query.Scope)
	})

	t.Run("all valid parameters parsed correctly", func(t *testing.T) {
		uID := "11111111-1111-1111-1111-111111111111"
		eqID := "22222222-2222-2222-2222-222222222222"
		tID := "33333333-3333-3333-3333-333333333333"
		search100 := strings.Repeat("s", 100)
		url := "/reservations?page=3&per_page=50&status=PENDING&user_id=" + uID +
			"&equipment_id=" + eqID + "&type_id=" + tID +
			"&search=" + search100 + "&sort=start_date_asc&scope=my" +
			"&start_date_from=2026-10-15&start_date_to=2026-10-25"
		req := httptest.NewRequest(http.MethodGet, url, nil)
		query, err := parseReservationListQuery(req)
		require.NoError(t, err)
		assert.Equal(t, 3, query.Page)
		assert.Equal(t, 50, query.PerPage)
		require.NotNil(t, query.Status)
		assert.Equal(t, "PENDING", *query.Status)
		require.NotNil(t, query.UserID)
		assert.Equal(t, uID, *query.UserID)
		require.NotNil(t, query.EquipmentID)
		assert.Equal(t, eqID, *query.EquipmentID)
		require.NotNil(t, query.TypeID)
		assert.Equal(t, tID, *query.TypeID)
		require.NotNil(t, query.Search)
		assert.Equal(t, search100, *query.Search)
		require.NotNil(t, query.Sort)
		assert.Equal(t, "start_date_asc", *query.Sort)
		require.NotNil(t, query.Scope)
		assert.Equal(t, "my", *query.Scope)
		require.NotNil(t, query.StartDateFrom)
		assert.Equal(t, "2026-10-15", *query.StartDateFrom)
		require.NotNil(t, query.StartDateTo)
		assert.Equal(t, "2026-10-25", *query.StartDateTo)
	})

	t.Run("invalid status enum returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/reservations?status=UNKNOWN_STATUS", nil)
		_, err := parseReservationListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid reservation status")
	})

	t.Run("invalid scope returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/reservations?scope=invalid_scope", nil)
		_, err := parseReservationListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid scope: must be 'all' or 'my'")
	})

	t.Run("invalid sort option returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/reservations?sort=unknown_sort", nil)
		_, err := parseReservationListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid sort option")
	})

	t.Run("search term exceeding max length returns error", func(t *testing.T) {
		search101 := strings.Repeat("x", 101)
		req := httptest.NewRequest(http.MethodGet, "/reservations?search="+search101, nil)
		_, err := parseReservationListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Search term too long")
	})

	t.Run("invalid user_id format returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/reservations?user_id=not-a-uuid", nil)
		_, err := parseReservationListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid user_id format")
	})

	t.Run("invalid equipment_id format returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/reservations?equipment_id=bad-uuid", nil)
		_, err := parseReservationListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid equipment_id format")
	})

	t.Run("invalid type_id format returns error", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/reservations?type_id=123", nil)
		_, err := parseReservationListQuery(req)
		require.Error(t, err)
		assert.Contains(t, err.Error(), "Invalid type_id format")
	})
}
