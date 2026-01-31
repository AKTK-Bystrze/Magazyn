//go:build integration

package reservation_test

import (
	"context"
	"os"
	"testing"

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
	// Load config from environment, .env, or .env.test
	// Tests run from inside the package directory. We need to point to the root .env
	// Assumes .env or .env.test is in project root (Magazyn/) which is 4 levels up: reservation -> service -> internal -> backend -> Magazyn
	// If .env is not found, config loader will automatically try .env.test
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

	reservationRepo := supabase.NewReservationRepository(client, supabaseURL, supabaseKey)
	equipmentRepo := supabase.NewEquipmentRepository(client, supabaseURL, supabaseKey)
	// equipmentTypeRepo used only if service needs it.
	// svc := reservation.NewReservationService(reservationRepo, equipmentRepo, userRepo)
	// If NewReservationService doesn't take eqTypes, we don't need it.

	// Check reservation_service.go later. For now, to fix "unused var", just use it or remove it.
	// supa.NewEquipmentTypeRepository is used here.
	// Check reservation_service.go later. For now, to fix "unused var", just use it or remove it.
	// supa.NewEquipmentTypeRepository is used here.
	_ = supabase.NewEquipmentTypeRepository(client, supabaseURL, supabaseKey) // Fake usage to pass lint until confirmed

	userRepo := supabase.NewUserRepository(client, supabaseURL, supabaseKey, supabaseKey)
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

// TestReservationIntegration_CreateAtomic verifies atomicity of reservation creation
// including credit deduction and conflict detection using the database RPC function.
func TestReservationIntegration_CreateAtomic(t *testing.T) {
	fixture := setupDateTestFixture(t)
	defer fixture.teardown()

	ctx := context.Background()
	initialBalance := fixture.getUserBalance(fixture.testUserID)

	// 1. Create reservation (tomorrow to day after)
	cmd := types.CreateReservationsCommand{
		Reservations: []types.CreateReservationItem{
			{
				EquipmentID: fixture.equipmentID,
				StartDate:   dateOffset(1),
				EndDate:     dateOffset(2),
			},
		},
	}

	resp, err := fixture.svc.Create(ctx, cmd, fixture.testUserID)
	require.NoError(t, err)
	assert.NotEmpty(t, resp.Reservations)
	assert.Equal(t, fixture.equipmentID, resp.Reservations[0].EquipmentID)
	t.Logf("Created reservation: %s", resp.Reservations[0].ID)

	// 2. Verify balance deducted (2 days × costPerDay)
	expectedCost := 2 * fixture.costPerDay
	actualCost := initialBalance - resp.RemainingBalance
	assert.Equal(t, expectedCost, actualCost, "Balance should decrease by 2 days cost")

	// 3. Verify conflict detection (try creating same reservation again)
	_, err = fixture.svc.Create(ctx, cmd, fixture.testUserID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "Reservation failed", "Should detect conflict")
	t.Logf("Conflict detection working ✓")

	// Cleanup happens via deferred fixture.teardown()
}
