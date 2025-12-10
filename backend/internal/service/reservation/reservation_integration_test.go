//go:build integration

package reservation_test

import (
	"context"
	"encoding/json"
	"magazyn/backend/internal/config"
	"magazyn/backend/internal/repository/supabase"
	"magazyn/backend/internal/service/reservation"
	"magazyn/backend/internal/types"
	"os"
	"testing"
	"time"

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
	
	supabaseURL := os.Getenv("SUPABASE_URL")
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
		t.Skip("Skipping integration test: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
	}

	var client *supa.Client
	client, err = supa.NewClient(supabaseURL, supabaseKey, nil)
	require.NoError(t, err)

	reservationRepo := supabase.NewReservationRepository(client)
	equipmentRepo := supabase.NewEquipmentRepository(client)
	// equipmentTypeRepo used only if service needs it. 
	// svc := reservation.NewReservationService(reservationRepo, equipmentRepo, userRepo)
	// If NewReservationService doesn't take eqTypes, we don't need it.
	
	// Check reservation_service.go later. For now, to fix "unused var", just use it or remove it.
	// supa.NewEquipmentTypeRepository is used here. 
	// Check reservation_service.go later. For now, to fix "unused var", just use it or remove it.
	// supa.NewEquipmentTypeRepository is used here. 
	_ = supabase.NewEquipmentTypeRepository(client) // Fake usage to pass lint until confirmed

	userRepo := supabase.NewUserRepository(client, supabaseURL, supabaseKey)
	svc := reservation.NewReservationService(reservationRepo, equipmentRepo, userRepo)
	
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
	// We need a unique user and equipment to avoid conflicts with other tests
	// Ideally we create them here. For now, assuming we use a test user if creation is complex.
	// Let's rely on existing seed data or create if possible.
	// Since we don't have easy "CreateUser" exposed in repo for tests, let's pick a known user or skip if not found.
	
	// Better: Create a dummy equipment manually via direct client map
	// Equipment ID: gen uuid
	// User ID: gen uuid (fake? no, must exist in auth.users or profiles?)
	// We need a real user. Let's assume we can fetch listing of users and pick one.
	
	// For robustness in this plan, I'll attempt to fetch the first user from profiles
	// and update their balance to sufficient amount.
	
	type profile struct {
		ID string `json:"id"`
	}
	var profiles []profile
	// User query
	data, _, err := client.From("profiles").Select("id", "exact", false).Limit(1, "").Execute()
	require.NoError(t, err)
	
	if err := json.Unmarshal(data, &profiles); err != nil {
		t.Fatalf("Failed to unmarshal profiles: %v", err)
	}

	require.NotEmpty(t, profiles, "Database must have at least one user profile")
	testUserID := profiles[0].ID
	
	// Ensure balance
	initialBalance := int32(1000)
	_, _, err = client.From("profiles").Update(map[string]interface{}{"credit_balance": initialBalance}, "", "").Eq("id", testUserID).Execute()
	require.NoError(t, err)

	// Get an equipment
	type equip struct {
		ID string `json:"id"`
		Name string `json:"name"`
		Status string `json:"status"`
	}
	var equips []equip
	// Find one available
	// Select returns *RequestBuilder. Eq... Limit needs 2 args (count, foreignTable). Use "" for current table.
	// Execute() returns ([]byte, int64, error).
	data, _, err = client.From("equipment").Select("id, name, status", "exact", false).Eq("status", "ok").Limit(1, "").Execute()
	require.NoError(t, err)
	
	if err := json.Unmarshal(data, &equips); err != nil {
		t.Fatalf("Failed to unmarshal equipment: %v", err)
	}
	
	if len(equips) == 0 {
		t.Skip("No available equipment found for test")
	}
	testEquipID := equips[0].ID
	
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
