// Package config handles application configuration loading and initialization.
// It loads environment variables, initializes the Supabase client, and provides application state management.
package config

import (
	"magazyn/backend/internal/logger"
	"context"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/supabase-community/supabase-go"
)

// Config holds all application configuration settings loaded from environment variables.
type Config struct {
	SupabaseURL        string   // URL of the Supabase project
	SupabaseKey        string   // Supabase anon/public key for client operations
	SupabaseServiceKey string   // Supabase service role key - used ONLY for Auth Admin API and tests
	Port               string   // HTTP server port
	LogLevel           string   // Logging verbosity: DEBUG, INFO, WARN, or ERROR
	CORSAllowedOrigins []string // List of allowed CORS origins for cross-origin requests
	AppURL             string   // Application base URL for magic link redirects and email links
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
			logger.Info(context.Background(), "No .env file found, relying on existing environment variables")
		}
	} else {
		// Try loading the specified path first
		if err := godotenv.Load(envPath); err != nil {
			// If the specified file doesn't exist, try .env.test fallback
			testEnvPath := strings.Replace(envPath, ".env", ".env.test", 1)
			if err := godotenv.Load(testEnvPath); err != nil {
				logger.Infof(context.Background(), "No .env file found at %s or %s, relying on existing environment variables", envPath, testEnvPath)
			} else {
				logger.Infof(context.Background(), "Loaded .env from %s", testEnvPath)
			}
		} else {
			logger.Infof(context.Background(), "Loaded .env from %s", envPath)
		}
	}

	cfg := &Config{
		SupabaseURL:        os.Getenv("PUBLIC_SUPABASE_URL"),
		SupabaseKey:        os.Getenv("PUBLIC_SUPABASE_ANON_KEY"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		Port:               os.Getenv("PORT"),
		LogLevel:           os.Getenv("LOG_LEVEL"),
		AppURL:             os.Getenv("PUBLIC_APP_URL"),
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

	if cfg.Port == "" {
		cfg.Port = "8080"
	}
	if cfg.LogLevel == "" {
		cfg.LogLevel = "INFO"
	}

	if cfg.SupabaseURL == "" || cfg.SupabaseKey == "" {
		logger.Error(context.Background(), "PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set in environment variables")
		os.Exit(1)
	}

	logger.Info(context.Background(), "?? Using Anon Key with JWT forwarding - RLS policies enforced per user")

	client, err := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseKey, nil)
	if err != nil {
		logger.Errorf(context.Background(), "Failed to initialize Supabase client: %v", err)
		os.Exit(1)
		return nil, err
	}

	return &AppState{
		Config:         cfg,
		SupabaseClient: client,
	}, nil
}
