package testutils

import (
	"context"
	"magazyn/backend/internal/logger"
	"fmt"
	"os"
	"path/filepath"
	"runtime"

	"magazyn/backend/internal/config"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/supabase-community/gotrue-go/types"
	"github.com/supabase-community/supabase-go"
)

var TestAppState *config.AppState
var TestClient *supabase.Client

// SetupIntegrationTest loads environment variables and initializes Supabase client
func SetupIntegrationTest() (*config.AppState, error) {
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	// Assuming this file is in backend/internal/testutils/
	// Project structure:
	// e:\bystrze\Magazyn\backend\internal\testutils\config.go
	// e:\bystrze\Magazyn\.env.test
	// relative path: ../../../.env.test (testutils -> internal -> backend -> Magazyn)

	// Try loading .env.test first (for testing), then .env as fallback
	// godotenv.Load does NOT override existing env vars
	envTestPath := filepath.Join(dir, "../../../.env.test")
	envPath := filepath.Join(dir, "../../../.env")

	loaded := false
	if err := godotenv.Load(envTestPath); err == nil {
		logger.Infof(context.Background(), "Loaded .env from %s", envTestPath)
		loaded = true
	} else if err := godotenv.Load(envPath); err == nil {
		logger.Infof(context.Background(), "Loaded .env from %s", envPath)
		loaded = true
	}

	if !loaded {
		logger.Infof(context.Background(), "Warning: No .env file found at %s or %s. Relying on process environment.", envTestPath, envPath)
	}

	url := os.Getenv("PUBLIC_SUPABASE_URL")

	// Prefer Service Role Key for tests to create/delete users
	key := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if key == "" {
		logger.Info(context.Background(), "SUPABASE_SERVICE_ROLE_KEY not found. Using Anon Key. Admin operations may fail.")
		key = os.Getenv("PUBLIC_SUPABASE_ANON_KEY")
	}

	if url == "" || key == "" {
		return nil, fmt.Errorf("missing PUBLIC_SUPABASE_URL or PUBLIC_SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY")
	}

	client, err := supabase.NewClient(url, key, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize supabase client: %w", err)
	}

	TestAppState = &config.AppState{
		Config: &config.Config{
			SupabaseURL: url,
			SupabaseKey: key,
			Port:        "8080", // Default test port
		},
		SupabaseClient: client,
	}
	TestClient = client

	return TestAppState, nil
}

// CreateTestUser creates authentication user for testing
func CreateTestUser(email, password string) (*types.User, error) {
	if TestAppState == nil || TestAppState.SupabaseClient == nil {
		return nil, fmt.Errorf("TestAppState not initialized")
	}

	// Note: Without Service Role Key, this might fail or require email confirmation
	// AdminCreateUser is ideal but depends on permissions.
	// If fallback to SignUp, email confirmation prevents immediate login.

	// ctx := context.Background()
	params := types.AdminCreateUserRequest{
		Email:        email,
		Password:     &password,
		EmailConfirm: true,
	}

	user, err := TestAppState.SupabaseClient.Auth.AdminCreateUser(params)
	if err != nil {
		return nil, err
	}

	return &user.User, nil
}

// DeleteTestUser removes a user by ID (cleanup)
func DeleteTestUser(userID string) error {
	if TestAppState == nil || TestAppState.SupabaseClient == nil {
		return fmt.Errorf("TestAppState not initialized")
	}
	uid, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user id uuid: %w", err)
	}

	return TestAppState.SupabaseClient.Auth.AdminDeleteUser(types.AdminDeleteUserRequest{
		UserID: uid,
	})
}
