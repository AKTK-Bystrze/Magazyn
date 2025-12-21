// Package config handles application configuration loading and initialization.
// It loads environment variables, initializes the Supabase client, and provides application state management.
package config

import (
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/supabase-community/supabase-go"
)

// Config holds all application configuration settings loaded from environment variables.
type Config struct {
	SupabaseURL        string   // URL of the Supabase project
	SupabaseKey        string   // Supabase anon/public key for client operations
	SupabaseServiceKey string   // Supabase service role key for admin operations
	Port               string   // HTTP server port
	LogLevel           string   // Logging verbosity: DEBUG, INFO, WARN, or ERROR
	CORSAllowedOrigins []string // List of allowed CORS origins for cross-origin requests
}

// AppState holds the initialized application state including configuration and clients.
// This centralizes state management and eliminates race conditions from global variables.
type AppState struct {
	Config         *Config
	SupabaseClient *supabase.Client
}

// LoadConfig initializes and returns application configuration and state.
// It loads environment variables from .env.test first (if exists), then .env.
// This ensures consistent behavior with Playwright E2E tests.
func LoadConfig() (*AppState, error) {
	envPath := os.Getenv("ENV_FILE_PATH")
	if envPath == "" {
		// Load .env.test first (for E2E testing), then .env as fallback
		// godotenv.Load does NOT override existing env vars, so order matters
		_ = godotenv.Load("../.env.test") // Ignore error if not exists
		if err := godotenv.Load("../.env"); err != nil {
			log.Printf("No .env file found, relying on existing environment variables")
		}
	} else {
		if err := godotenv.Load(envPath); err != nil {
			log.Printf("No .env file found at %s, relying on existing environment variables", envPath)
		}
	}

	cfg := &Config{
		SupabaseURL:        os.Getenv("SUPABASE_URL"),
		SupabaseKey:        os.Getenv("SUPABASE_KEY"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		Port:               os.Getenv("PORT"),
		LogLevel:           os.Getenv("LOG_LEVEL"),
	}

	corsOrigins := os.Getenv("CORS_ALLOWED_ORIGINS")
	if corsOrigins != "" {
		cfg.CORSAllowedOrigins = strings.Split(corsOrigins, ",")
		for i := range cfg.CORSAllowedOrigins {
			cfg.CORSAllowedOrigins[i] = strings.TrimSpace(cfg.CORSAllowedOrigins[i])
		}
	} else {
		cfg.CORSAllowedOrigins = []string{"http://localhost:4321", "http://localhost:3000"}
	}

	if cfg.SupabaseURL == "" {
		cfg.SupabaseURL = os.Getenv("VITE_SUPABASE_URL")
	}
	if cfg.SupabaseKey == "" {
		cfg.SupabaseKey = os.Getenv("VITE_SUPABASE_ANON_KEY")
	}
	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.LogLevel == "" {
		cfg.LogLevel = "INFO"
	}

	if cfg.SupabaseURL == "" || cfg.SupabaseKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) must be set in environment variables")
	}

	log.Println("🔑 Using Anon Key with JWT forwarding - RLS policies enforced per user")

	client, err := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseKey, nil)
	if err != nil {
		log.Fatalf("Failed to initialize Supabase client: %v", err)
		return nil, err
	}

	return &AppState{
		Config:         cfg,
		SupabaseClient: client,
	}, nil
}
