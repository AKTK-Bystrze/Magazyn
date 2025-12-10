//go:build integration

package reservation_test

import (
	"context"
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
	// Assuming .env is in project root, we might need to adjust path or rely on env vars being set
	cfg, err := config.LoadConfig()
	if err != nil {
		t.Log("Warning: Could not load config via LoadConfig, trying env vars directly or skipping")
	}
	
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY") // Use service role for cleanup/setup

	if supabaseURL == "" || supabaseKey == "" {
		if cfg != nil {
			supabaseURL = cfg.Config.SupabaseURL
			supabaseKey = cfg.Config.SupabaseKey
		}
	}
	
	if supabaseURL == "" || supabaseKey == "" {
		t.Skip("Skipping integration test: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
	}

	client, err := supa.NewClient(supabaseURL, supabaseKey, nil)
	require.NoError(t, err)

	reservationRepo := supabase.NewReservationRepository(client)
	equipmentRepo := supabase.NewEquipmentRepository(client)
	equipmentTypeRepo := supabase.NewEquipmentTypeRepository(client)
	userRepo := supabase.NewUserRepository(client, supabaseURL, supabaseKey)

	svc := reservation.NewReservationService(reservationRepo, equipmentRepo, userRepo)
	
	return svc, *cfg, client
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
	_, err := client.From("profiles").Select("id", "exact", false).Limit(1).ExecuteTo(&profiles)
	require.NoError(t, err)
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
	_, err = client.From("equipment").Select("id, name, status", "exact", false).Eq("status", "ok").Limit(1).ExecuteTo(&equips)
	require.NoError(t, err)
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
