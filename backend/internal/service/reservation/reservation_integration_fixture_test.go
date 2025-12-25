//go:build integration

package reservation_test

import (
	"context"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/require"
	supa "github.com/supabase-community/supabase-go"
)

// dateTestFixture provides an isolated test environment for date-focused integration tests.
// It manages the lifecycle of:
// - A unique equipment type (fetched from DB)
// - Unique equipment item (created per test)
// - Two test users (fetched from DB, balances reset)
// - Automatic resource cleanup
type dateTestFixture struct {
	t           *testing.T
	svc         reservation.ReservationService
	client      *supa.Client
	testUserID  string
	testUser2ID string
	equipmentID string
	typeID      string
	costPerDay  int32
	cleanup     []func()
}

// setupDateTestFixture creates and initializes a new test fixture.
// It ensures necessary database state exists (equipment, users with credits)
// and registers a cleanup function for the test capability.
func setupDateTestFixture(t *testing.T) *dateTestFixture {
	svc, _, client := setupIntegrationTest(t)

	fixture := &dateTestFixture{
		t:       t,
		svc:     svc,
		client:  client,
		cleanup: []func(){},
	}

	initializeFixture(t, fixture, client)
	return fixture
}

func initializeFixture(t *testing.T, fixture *dateTestFixture, client *supa.Client) {
	// Get equipment type cost
	type EquipType struct {
		ID               string `json:"id"`
		CreditCostPerDay int32  `json:"credit_cost_per_day"`
	}
	var eqTypes []EquipType
	data, _, err := client.From("equipment_types").Select("id,credit_cost_per_day", "exact", false).Limit(1, "").Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &eqTypes))
	require.NotEmpty(t, eqTypes)

	fixture.typeID = eqTypes[0].ID
	fixture.costPerDay = eqTypes[0].CreditCostPerDay

	// Create unique equipment
	createUniqueEquipment(t, fixture)

	// Setup users
	setupTestUsers(t, fixture)
}

func createUniqueEquipment(t *testing.T, fixture *dateTestFixture) {
	uniqueSuffix := time.Now().Format("20060102150405.000")
	newEq := map[string]interface{}{
		"name":        "Test Equip Date " + uniqueSuffix,
		"type_id":     fixture.typeID,
		"status":      "ok",
		"internal_id": "TEST-DATE-" + uniqueSuffix,
	}

	var createdEq []struct {
		ID string `json:"id"`
	}
	data, _, err := fixture.client.From("equipment").Insert(newEq, false, "", "representation", "").Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &createdEq))
	require.NotEmpty(t, createdEq)
	fixture.equipmentID = createdEq[0].ID
	t.Logf("Created test equipment: %s (cost: %d/day)", fixture.equipmentID, fixture.costPerDay)

	fixture.cleanup = append(fixture.cleanup, func() {
		fixture.client.From("equipment").Delete("", "").Eq("id", fixture.equipmentID).Execute()
	})
}

func setupTestUsers(t *testing.T, fixture *dateTestFixture) {
	//  Try to get existing users from the database
	type profile struct {
		ID string `json:"id"`
	}
	var profiles []profile
	data, _, err := fixture.client.From("profiles").Select("id", "exact", false).Limit(2, "").Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &profiles))

	if len(profiles) < 2 {
		t.Skip("Skipping test: Need at least 2 users in the database. Run: npx supabase db seed (or create users manually)")
	}

	fixture.testUserID = profiles[0].ID
	fixture.testUser2ID = profiles[1].ID

	// Reset credits to known state
	initialBalance := int32(100000)
	_, _, _ = fixture.client.From("profiles").Update(map[string]interface{}{"credit_balance": initialBalance}, "", "").Eq("id", fixture.testUserID).Execute()
	_, _, _ = fixture.client.From("profiles").Update(map[string]interface{}{"credit_balance": initialBalance}, "", "").Eq("id", fixture.testUser2ID).Execute()

	t.Logf("Using test users: %s, %s", fixture.testUserID, fixture.testUser2ID)
}

// teardown executes all registered cleanup functions in LIFO order.
func (f *dateTestFixture) teardown() {
	for i := len(f.cleanup) - 1; i >= 0; i-- {
		f.cleanup[i]()
	}
}

// createTestReservation is a helper to create a reservation for a specific number of days offset from today.
// It automatically registers the reservation for cleanup.
func (f *dateTestFixture) createTestReservation(
	userID string,
	startDays int,
	endDays int,
) (string, error) {
	ctx := context.Background()

	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: f.equipmentID,
				StartDate:   dateOffset(startDays),
				EndDate:     dateOffset(endDays),
			},
		},
	}

	resp, err := f.svc.Create(ctx, cmd, userID)
	if err != nil {
		return "", err
	}

	if len(resp.Reservations) == 0 {
		return "", fmt.Errorf("no reservations created")
	}

	reservationID := resp.Reservations[0].ID

	f.cleanup = append(f.cleanup, func() {
		f.client.From("reservations").Delete("", "").Eq("id", reservationID).Execute()
	})

	return reservationID, nil
}

// dateOffset returns a date string (YYYY-MM-DD) calculated by adding 'days' to the current date.
func dateOffset(days int) string {
	return time.Now().AddDate(0, 0, days).Format("2006-01-02")
}

// todayStr returns the current date as a string in YYYY-MM-DD format.
func todayStr() string {
	return time.Now().Format("2006-01-02")
}

// getUserBalance fetches the current credit balance for the specified user from the database.
func (f *dateTestFixture) getUserBalance(userID string) int32 {
	type profile struct {
		CreditBalance int32 `json:"credit_balance"`
	}
	var profiles []profile
	data, _, err := f.client.From("profiles").Select("credit_balance", "exact", false).Eq("id", userID).Execute()
	require.NoError(f.t, err)
	require.NoError(f.t, json.Unmarshal(data, &profiles))
	require.NotEmpty(f.t, profiles)
	return profiles[0].CreditBalance
}

// dateStringPtr returns a pointer to the provided string.
// Useful for constructing struct fields that are pointers.
func dateStringPtr(s string) *string {
	return &s
}
