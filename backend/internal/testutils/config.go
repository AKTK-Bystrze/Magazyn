package testutils

import (
	"fmt"
	"log"
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

// SetupIntegrationTest loads environment variables and initializes Supabase client
func SetupIntegrationTest() (*config.AppState, error) {
	_, filename, _, _ := runtime.Caller(0)
	dir := filepath.Dir(filename)
	// Assuming this file is in backend/internal/testutils/
	// .env is in project root (../../../../.env) relative to this file?
	// Project structure:
	// e:\bystrze\Magazyn\backend\internal\testutils\config.go
	// e:\bystrze\Magazyn\.env
	// relative path: ../../../.env

	envPath := filepath.Join(dir, "../../../.env")

	if err := godotenv.Load(envPath); err != nil {
		log.Printf("Warning: Error loading .env file from %s: %v. Relying on process environment.", envPath, err)
	} else {
		log.Printf("Loaded .env from %s", envPath)
	}

	url := os.Getenv("SUPABASE_URL")
	if url == "" {
		url = os.Getenv("VITE_SUPABASE_URL")
	}

	// Prefer Service Role Key for tests to create/delete users
	key := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if key == "" {
		log.Println("⚠️ SUPABASE_SERVICE_ROLE_KEY not found. Using Anon Key. Admin operations may fail.")
		key = os.Getenv("SUPABASE_KEY")
		if key == "" {
			key = os.Getenv("VITE_SUPABASE_ANON_KEY")
		}
	}

	if url == "" || key == "" {
		return nil, fmt.Errorf("missing SUPABASE_URL or SUPABASE_KEY/SUPABASE_SERVICE_ROLE_KEY")
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
func DeleteTestUser(userId string) error {
	if TestAppState == nil || TestAppState.SupabaseClient == nil {
		return fmt.Errorf("TestAppState not initialized")
	}
	uid, err := uuid.Parse(userId)
	if err != nil {
		return fmt.Errorf("invalid user id uuid: %w", err)
	}

	return TestAppState.SupabaseClient.Auth.AdminDeleteUser(types.AdminDeleteUserRequest{
		UserID: uid,
	})
}
