//go:build integration

package calendar_test

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"magazyn/backend/internal/config"
	"magazyn/backend/internal/constants"
	"magazyn/backend/internal/repository/supabase"
	"magazyn/backend/internal/service/calendar"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	supa "github.com/supabase-community/supabase-go"
)

// ============================================================================
// Test Fixture
// ============================================================================

type calendarTestFixture struct {
	t            *testing.T
	svc          calendar.CalendarService
	client       *supa.Client
	testUserID   string
	equipment1ID string
	equipment2ID string
	equipment3ID string
	typeID       string
	cleanup      []func()
}

func setupCalendarTestFixture(t *testing.T) *calendarTestFixture {
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

	calendarRepo := supabase.NewCalendarRepository(client)
	typeRepo := supabase.NewEquipmentTypeRepository(client)

	svc := calendar.NewCalendarService(calendarRepo, typeRepo)

	fixture := &calendarTestFixture{
		t:       t,
		svc:     svc,
		client:  client,
		cleanup: []func(){},
	}

	fixture.setupTestData()
	return fixture
}

func (f *calendarTestFixture) setupTestData() {
	// Get test user
	type profile struct {
		ID string `json:"id"`
	}
	var profiles []profile
	data, _, _ := f.client.From("profiles").Select("id", "exact", false).Limit(1, "").Execute()
	json.Unmarshal(data, &profiles)
	if len(profiles) > 0 {
		f.testUserID = profiles[0].ID
	}

	// Get equipment type
	type eqType struct {
		ID string `json:"id"`
	}
	var types []eqType
	data, _, _ = f.client.From("equipment_types").Select("id", "exact", false).Limit(1, "").Execute()
	json.Unmarshal(data, &types)
	if len(types) > 0 {
		f.typeID = types[0].ID
	}

	// Create 3 test equipment items
	f.equipment1ID = f.createTestEquipment("CAL-TEST-1")
	f.equipment2ID = f.createTestEquipment("CAL-TEST-2")
	f.equipment3ID = f.createTestEquipment("CAL-TEST-3")
}

func (f *calendarTestFixture) createTestEquipment(internalID string) string {
	suffix := time.Now().Format("150405")
	newEq := map[string]interface{}{
		"name":        "Calendar Test " + internalID,
		"type_id":     f.typeID,
		"status":      "ok",
		"internal_id": internalID + "-" + suffix,
	}

	var created []struct {
		ID string `json:"id"`
	}
	data, _, _ := f.client.From("equipment").Insert(newEq, false, "", "representation", "").Execute()
	json.Unmarshal(data, &created)

	if len(created) > 0 {
		eqID := created[0].ID
		f.cleanup = append(f.cleanup, func() {
			f.client.From("equipment").Delete("", "").Eq("id", eqID).Execute()
		})
		return eqID
	}
	return ""
}

func (f *calendarTestFixture) createReservation(equipmentID string, startDays, endDays int) {
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
			f.client.From("reservations").Delete("", "").Eq("id", resID).Execute()
		})
	}
}

func (f *calendarTestFixture) teardown() {
	for i := len(f.cleanup) - 1; i >= 0; i-- {
		f.cleanup[i]()
	}
}

// ============================================================================
// P2.3: CalendarService Integration Tests
// ============================================================================

// TestCalendarAvailability_MultipleEquipment_CorrectGrid verifies that the
// calendar service returns a grid of availability for multiple equipment items.
func TestCalendarAvailability_MultipleEquipment_CorrectGrid(t *testing.T) {
	fixture := setupCalendarTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Arrange: Query 7 days starting tomorrow
	startDate := time.Now().AddDate(0, 0, 1).Format("2006-01-02")

	// Act: Get calendar for all equipment (no filter), 7 days
	query := types.CalendarAvailabilityQuery{
		StartDate: &startDate,
		Days:      7,
	}
	resp, err := fixture.svc.GetCalendarAvailability(ctx, query)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, resp)
	
	// Should have at least 3 equipment × 7 days = 21 entries (our test equipment)
	// But there might be more equipment in the database
	assert.GreaterOrEqual(t, len(resp.Calendar), 21, "Should have at least 21 entries (3 equipment × 7 days)")

	// Verify structure: each entry has required fields
	for _, entry := range resp.Calendar {
		assert.NotEmpty(t, entry.Date, "Entry should have date")
		assert.NotEmpty(t, entry.EquipmentID, "Entry should have equipment ID")
		assert.NotEmpty(t, entry.EquipmentName, "Entry should have equipment name")
	}

	t.Logf("✓ Calendar grid created: %d entries for 7 days", len(resp.Calendar))
}

// TestCalendarAvailability_WithReservations_ShowsBlocked verifies that
// reserved dates are marked as unavailable in the calendar.
func TestCalendarAvailability_WithReservations_ShowsBlocked(t *testing.T) {
	fixture := setupCalendarTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Arrange: Create reservation for equipment1, days 2-4
	fixture.createReservation(fixture.equipment1ID, 2, 4)

	// Act: Get calendar for only equipment1, 7 days starting tomorrow
	startDate := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	query := types.CalendarAvailabilityQuery{
		EquipmentID: &fixture.equipment1ID,
		StartDate:   &startDate,
		Days:        7,
	}
	resp, err := fixture.svc.GetCalendarAvailability(ctx, query)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, 7, len(resp.Calendar), "Should have exactly 7 entries (1 equipment × 7 days)")

	// Count blocked days (days 2-4 from query start = indices 1, 2, 3 in 7-day grid)
	blockedCount := 0
	availableCount := 0
	for _, entry := range resp.Calendar {
		if entry.IsAvailable {
			availableCount++
		} else {
			blockedCount++
			// Verify reservation info is populated
			assert.NotNil(t, entry.ReservationID, "Blocked entry should have reservation ID")
			assert.NotNil(t, entry.ReservationStatus, "Blocked entry should have status")
		}
	}

	// At least 3 days should be blocked (days 2, 3, 4)
	assert.GreaterOrEqual(t, blockedCount, 3, "Should have at least 3 blocked days")
	assert.GreaterOrEqual(t, availableCount, 1, "Should have at least some available days")
	
	t.Logf("✓ Calendar shows %d blocked, %d available days", blockedCount, availableCount)
}

// TestCalendarAvailability_FilterByEquipment_ReturnsOnlySpecified verifies
// that when filtering by equipment ID, only that equipment's calendar is returned.
func TestCalendarAvailability_FilterByEquipment_ReturnsOnlySpecified(t *testing.T) {
	fixture := setupCalendarTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Act: Get calendar for only equipment2, 5 days
	startDate := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	query := types.CalendarAvailabilityQuery{
		EquipmentID: &fixture.equipment2ID,
		StartDate:   &startDate,
		Days:        5,
	}
	resp, err := fixture.svc.GetCalendarAvailability(ctx, query)

	// Assert
	require.NoError(t, err)
	assert.NotNil(t, resp)
	assert.Equal(t, 5, len(resp.Calendar), "Should have exactly 5 entries (1 equipment × 5 days)")

	// All entries should be for the same equipment
	for _, entry := range resp.Calendar {
		assert.Equal(t, fixture.equipment2ID, entry.EquipmentID, "All entries should be for equipment2")
	}

	t.Logf("✓ Calendar filter works: returned only specified equipment")
}
