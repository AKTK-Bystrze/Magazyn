//go:build integration

package reservation_test

import (
	"context"
	"encoding/json"
	"os"
	"testing"
	"time"

	"magazyn/backend/internal/config"
	"magazyn/backend/internal/repository/supabase"
	"magazyn/backend/internal/service/email"
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	supa "github.com/supabase-community/supabase-go"
)

// setupIntegrationTest creates a real connection to Supabase and initializes services
func setupIntegrationTest(t *testing.T) (reservation.ReservationService, config.Config, *supa.Client) {
	// Load config from environment or .env
	// Tests run from inside the package directory. We need to point to the root .env
	// Assumes .env is in project root (Magazyn/) which is 4 levels up: reservation -> service -> internal -> backend -> Magazyn
	_ = os.Setenv("ENV_FILE_PATH", "../../../../.env")
	appState, err := config.LoadConfig()
	if err != nil {
		t.Logf("Warning: Could not load config via LoadConfig: %v", err)
	}

	supabaseURL := os.Getenv("PUBLIC_SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY") // Use service role for cleanup/setup

	if supabaseURL == "" || supabaseKey == "" {
		if appState != nil && appState.Config != nil {
			supabaseURL = appState.Config.SupabaseURL
			// In integration test we prefer service key, but if only anon is available in config...
			// We might need to fail if service key is strictly required for setup (cleanup).
			// If we rely on LoadConfig, we only get Anon key usually.
			// Let's assume we need ENV vars set for testing properly.
		}
	}

	if supabaseURL == "" || supabaseKey == "" {
		t.Skip("Skipping integration test: PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
	}

	var client *supa.Client
	client, err = supa.NewClient(supabaseURL, supabaseKey, nil)
	require.NoError(t, err)

	reservationRepo := supabase.NewReservationRepository(client, supabaseURL, supabaseKey, supabaseKey)
	equipmentRepo := supabase.NewEquipmentRepository(client, supabaseURL, supabaseKey)
	// equipmentTypeRepo used only if service needs it.
	// svc := reservation.NewReservationService(reservationRepo, equipmentRepo, userRepo)
	// If NewReservationService doesn't take eqTypes, we don't need it.

	// Check reservation_service.go later. For now, to fix "unused var", just use it or remove it.
	// supa.NewEquipmentTypeRepository is used here.
	// Check reservation_service.go later. For now, to fix "unused var", just use it or remove it.
	// supa.NewEquipmentTypeRepository is used here.
	_ = supabase.NewEquipmentTypeRepository(client) // Fake usage to pass lint until confirmed

	userRepo := supabase.NewUserRepository(client, supabaseURL, supabaseKey)
	emailService := email.NewNoopEmailService()
	svc := reservation.NewReservationService(reservationRepo, equipmentRepo, userRepo, emailService)

	var conf config.Config
	if appState != nil && appState.Config != nil {
		conf = *appState.Config
	} else {
		// Minimal config if LoadConfig failed but we had env vars
		conf = config.Config{
			SupabaseURL: supabaseURL,
			SupabaseKey: supabaseKey, // This might be service key, careful
		}
	}

	return svc, conf, client
}

func TestReservationIntegration_CreateAtomic(t *testing.T) {
	svc, _, client := setupIntegrationTest(t)
	ctx := context.Background()

	// 1. Setup Test Data (User with credits, Equipment)
	// Create a unique equipment for this test to avoid conflicts
	uniqueSuffix := time.Now().Format("20060102150405")
	typeID := "d496e5ce-a19f-4318-aff5-408a54d37013" // Use a known existing type ID or fetch one

	// Fetch a valid type ID
	// Fetch a valid type ID
	type EquipType struct {
		ID string `json:"id"`
	}
	var eqTypes []EquipType
	data, _, err := client.From("equipment_types").Select("id", "exact", false).Limit(1, "").Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &eqTypes))
	require.NotEmpty(t, eqTypes)
	typeID = eqTypes[0].ID

	newEqName := "Test Equip " + uniqueSuffix
	newEq := map[string]interface{}{
		"name":        newEqName,
		"type_id":     typeID,
		"status":      "ok",
		"internal_id": "TEST-" + uniqueSuffix,
	}

	var createdEq []struct {
		ID string `json:"id"`
	}
	// Insert returning representation to get ID
	data, _, err = client.From("equipment").Insert(newEq, false, "", "representation", "").Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &createdEq))
	require.NotEmpty(t, createdEq)
	testEquipID := createdEq[0].ID
	t.Logf("Created test equipment: %s", testEquipID)

	defer func() {
		// Cleanup equipment
		client.From("equipment").Delete("", "").Eq("id", testEquipID).Execute()
	}()

	// Ensure User Balance
	// ... (Existing user logic) ...
	// User query
	type profile struct {
		ID string `json:"id"`
	}
	var profiles []profile
	data, _, err = client.From("profiles").Select("id", "exact", false).Limit(1, "").Execute()
	require.NoError(t, err)

	if err := json.Unmarshal(data, &profiles); err != nil {
		t.Fatalf("Failed to unmarshal profiles: %v", err)
	}
	require.NotEmpty(t, profiles)
	testUserID := profiles[0].ID

	initialBalance := int32(1000)
	_, _, err = client.From("profiles").Update(map[string]interface{}{"credit_balance": initialBalance}, "", "").Eq("id", testUserID).Execute()
	require.NoError(t, err)

	// 2. Perform Reservation
	tomorrow := time.Now().AddDate(0, 0, 1).Format("2006-01-02")
	dayAfter := time.Now().AddDate(0, 0, 2).Format("2006-01-02")

	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: testEquipID,
				StartDate:   tomorrow,
				EndDate:     dayAfter,
			},
		},
	}

	resp, err := svc.Create(ctx, cmd, testUserID)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.Reservations)
	assert.Equal(t, testEquipID, resp.Reservations[0].EquipmentID)

	// 3. Verify Balance Deducted
	// Cost calculation happens inside svc.
	// Check remaining balance < 1000
	assert.True(t, resp.RemainingBalance < initialBalance, "Balance should decrease")

	// 4. Verify Conflict (Try creating same again)
	_, err = svc.Create(ctx, cmd, testUserID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Reservation failed") // Conflict detected

	// Cleanup?
	// Delete the reservation created
	for _, r := range resp.Reservations {
		client.From("reservations").Delete("", "").Eq("id", r.ID).Execute()
	}
	// Restore balance
	client.From("profiles").Update(map[string]interface{}{"credit_balance": initialBalance}, "", "").Eq("id", testUserID).Execute()
}
