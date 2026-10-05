// Package config loads environment variables, initializes the Supabase client, and provides application state management.
package config

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"magazyn/backend/internal/logger"

	"github.com/joho/godotenv"
	"github.com/supabase-community/supabase-go"
)

// Config holds application configuration settings loaded from environment variables.
type Config struct {
	// SupabaseURL is the URL of the Supabase project.
	SupabaseURL string
	// SupabaseKey is the Supabase anon/public key for client operations.
	SupabaseKey string
	// SupabaseServiceKey is the Supabase service role key used only for Auth Admin API and tests.
	SupabaseServiceKey string
	// Port is the HTTP server port.
	Port string
	// LogLevel is the logging verbosity: DEBUG, INFO, WARN, or ERROR.
	LogLevel string
	// CORSAllowedOrigins lists allowed CORS origins for cross-origin requests.
	CORSAllowedOrigins []string
	// AppURL is the application base URL for magic link redirects and email links.
	AppURL string
}

// AppState bundles the runtime configuration and active Supabase client.
type AppState struct {
	Config         *Config
	SupabaseClient *supabase.Client
}

// LoadConfig reads configuration from the environment and initializes application state.
func LoadConfig() (*AppState, error) {
	envPath := os.Getenv("ENV_FILE_PATH")
	if envPath == "" {
		_ = godotenv.Load("../.env.test")
		if err := godotenv.Load("../.env"); err != nil {
			logger.Info(context.Background(), "No .env file found, relying on existing environment variables")
		}
	} else {
		if err := godotenv.Load(envPath); err != nil {
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
		return nil, errors.New("PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY must be set in environment variables")
	}
	logger.Info(context.Background(), "Using Anon Key with JWT forwarding - RLS policies enforced per user")
	client, err := supabase.NewClient(cfg.SupabaseURL, cfg.SupabaseKey, nil)
	if err != nil {
		logger.Errorf(context.Background(), "Failed to initialize Supabase client: %v", err)
		return nil, fmt.Errorf("failed to initialize Supabase client: %w", err)
	}
	return &AppState{
		Config:         cfg,
		SupabaseClient: client,
	}, nil
}
