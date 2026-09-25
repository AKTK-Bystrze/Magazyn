//go:build integration

package reservation_test

import (
	"magazyn/backend/internal/config"
	"magazyn/backend/internal/repository/supabase"
	"magazyn/backend/internal/service/email"
	"magazyn/backend/internal/service/reservation"
	"os"
	"testing"

	"github.com/stretchr/testify/require"
	supa "github.com/supabase-community/supabase-go"
)

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
