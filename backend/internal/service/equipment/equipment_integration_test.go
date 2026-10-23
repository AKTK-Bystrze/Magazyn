//go:build integration

package equipment_test

import (
	"context"
	"encoding/json"
	"magazyn/backend/internal/config"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository/supabase"
	"magazyn/backend/internal/service/equipment"
	"magazyn/backend/internal/types"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	supa "github.com/supabase-community/supabase-go"
)

type equipmentTestFixture struct {
	t           *testing.T
	svc         *equipment.EquipmentService
	client      *supa.Client
	testUserID  string
	equipmentID string
	typeID      string
	cleanup     []func()
}

func setupEquipmentTestFixture(t *testing.T) *equipmentTestFixture {
	_ = os.Setenv("ENV_FILE_PATH", "../../../../.env")
	_, err := config.LoadConfig()
	require.NoError(t, err)
	supabaseURL := os.Getenv("PUBLIC_SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if supabaseURL == "" || supabaseKey == "" {
		t.Skip("Skipping integration test: Supabase credentials not set")
	}
	client, err := supa.NewClient(supabaseURL, supabaseKey, nil)
	require.NoError(t, err)
	equipmentRepo := supabase.NewEquipmentRepository(client, supabaseURL, supabaseKey)
	typeRepo := supabase.NewEquipmentTypeRepository(client, supabaseURL, supabaseKey)
	userRepo := supabase.NewUserRepository(client, supabaseURL, supabaseKey, supabaseKey)
	svc := equipment.NewEquipmentService(equipmentRepo, typeRepo, userRepo, supabaseURL)
	fixture := &equipmentTestFixture{
		t:       t,
		svc:     svc,
		client:  client,
		cleanup: []func(){},
	}
	fixture.setupTestData()
	return fixture
}
func (f *equipmentTestFixture) setupTestData() {
	type profile struct {
		ID string `json:"id"`
	}
	var profiles []profile
	data, _, _ := f.client.From("profiles").Select("id", "exact", false).Limit(1, "").Execute()
	json.Unmarshal(data, &profiles)
	if len(profiles) > 0 {
		f.testUserID = profiles[0].ID
	}
	type eqType struct {
		ID string `json:"id"`
	}
	var types []eqType
	data, _, _ = f.client.From("equipment_types").Select("id", "exact", false).Limit(1, "").Execute()
	json.Unmarshal(data, &types)
	if len(types) > 0 {
		f.typeID = types[0].ID
	}
	f.createTestEquipment()
}
func (f *equipmentTestFixture) createTestEquipment() {
	suffix := time.Now().Format("150405.000")
	newEq := map[string]interface{}{
		"name":        "Integration Test Equipment " + suffix,
		"type_id":     f.typeID,
		"status":      "ok",
		"internal_id": "INT-TEST-" + suffix,
	}
	var created []struct {
		ID string `json:"id"`
	}
	data, _, _ := f.client.From("equipment").Insert(newEq, false, "", "representation", "").Execute()
	json.Unmarshal(data, &created)
	if len(created) > 0 {
		f.equipmentID = created[0].ID
	}
	f.cleanup = append(f.cleanup, func() {
		f.client.From("maintenance_logs").Delete("", "").Eq("equipment_id", f.equipmentID).Execute()
		f.client.From("equipment").Delete("", "").Eq("id", f.equipmentID).Execute()
	})
}
func (f *equipmentTestFixture) teardown() {
	for i := len(f.cleanup) - 1; i >= 0; i-- {
		f.cleanup[i]()
	}
}
func (f *equipmentTestFixture) addToFavorites(equipmentID string) {
	startDate := time.Now().AddDate(0, 0, -7).Format("2006-01-02")
	endDate := time.Now().AddDate(0, 0, -4).Format("2006-01-02")
	data, _, err := f.client.From("reservations").Insert(map[string]interface{}{
		"user_id":      f.testUserID,
		"equipment_id": equipmentID,
		"start_date":   startDate,
		"end_date":     endDate,
		"status":       constants.ReservationStatusReturned,
	}, false, "", "representation", "").Execute()
	require.NoError(f.t, err)
	var created []struct {
		ID string `json:"id"`
	}
	require.NoError(f.t, json.Unmarshal(data, &created))
	require.NotEmpty(f.t, created, "completed rental should be created")
	reservationID := created[0].ID

	f.cleanup = append(f.cleanup, func() {
		f.client.From("reservation_history").Delete("", "").Eq("reservation_id", reservationID).Execute()
		f.client.From("credit_history").Delete("", "").Eq("reservation_id", reservationID).Execute()
		f.client.From("reservations").Delete("", "").Eq("id", reservationID).Execute()
	})
}
func (f *equipmentTestFixture) createReservation(equipmentID string, startDays, endDays int) string {
	start := time.Now().AddDate(0, 0, startDays).Format("2006-01-02")
	end := time.Now().AddDate(0, 0, endDays).Format("2006-01-02")
	res := map[string]interface{}{
		"user_id":      f.testUserID,
		"equipment_id": equipmentID,
		"start_date":   start,
		"end_date":     end,
		"status":       constants.ReservationStatusPending,
	}
	var created []struct {
		ID string `json:"id"`
	}
	data, _, _ := f.client.From("reservations").Insert(res, false, "", "representation", "").Execute()
	json.Unmarshal(data, &created)
	if len(created) > 0 {
		resID := created[0].ID
		f.cleanup = append(f.cleanup, func() {
			f.client.From("reservation_history").Delete("", "").Eq("reservation_id", resID).Execute()
			f.client.From("credit_history").Delete("", "").Eq("reservation_id", resID).Execute()
			f.client.From("reservations").Delete("", "").Eq("id", resID).Execute()
		})
		return resID
	}
	return ""
}

// TestEquipmentList_WithFavorites_MarksCorrectly verifies that when a user
// lists equipment, items in their favorites are marked with is_favorite=true.
func TestEquipmentList_WithFavorites_MarksCorrectly(t *testing.T) {
	fixture := setupEquipmentTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	fixture.addToFavorites(fixture.equipmentID)
	query := types.EquipmentListQuery{
		Page:    1,
		PerPage: 50,
	}
	resp, err := fixture.svc.List(ctx, fixture.testUserID, query)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	foundTestEquipment := false
	for _, eq := range resp.Equipment {
		if eq.ID == fixture.equipmentID {
			foundTestEquipment = true
			if assert.NotNil(t, eq.IsFavorite) {
				assert.True(t, *eq.IsFavorite, "Added favorite equipment should have is_favorite=true")
			}
			break
		}
	}
	assert.True(t, foundTestEquipment, "Test equipment should be found in equipment list")
}

func TestCheckAvailability_BookedDates_ReturnsUnavailable(t *testing.T) {
	fixture := setupEquipmentTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	fixture.createReservation(fixture.equipmentID, 5, 7)
	startDate := time.Now().AddDate(0, 0, 6).Format("2006-01-02")
	endDate := time.Now().AddDate(0, 0, 8).Format("2006-01-02")
	query := types.AvailabilityQuery{
		StartDate: startDate,
		EndDate:   endDate,
	}
	resp, err := fixture.svc.CheckAvailability(ctx, fixture.equipmentID, query)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.False(t, resp.IsAvailable, "Equipment should NOT be available (overlaps with reservation)")
	t.Logf("✓ Availability check correctly identifies booked dates")
}

func TestCheckAvailability_FreeDates_ReturnsAvailable(t *testing.T) {
	fixture := setupEquipmentTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()
	fixture.createReservation(fixture.equipmentID, 5, 7)
	startDate := time.Now().AddDate(0, 0, 10).Format("2006-01-02")
	endDate := time.Now().AddDate(0, 0, 12).Format("2006-01-02")
	query := types.AvailabilityQuery{
		StartDate: startDate,
		EndDate:   endDate,
	}
	resp, err := fixture.svc.CheckAvailability(ctx, fixture.equipmentID, query)
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.True(t, resp.IsAvailable, "Equipment should be available (no overlapping reservations)")
	t.Logf("✓ Availability check correctly identifies free dates")
}
