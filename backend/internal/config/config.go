package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/supabase-community/supabase-go"
)

type Config struct {
	SupabaseURL string
	SupabaseKey string
}

var AppConfig *Config
var SupabaseClient *supabase.Client

func LoadConfig() {
	// Load .env file from project root (one level up from backend folder)
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found at ../.env, relying on existing environment variables")
	}

	AppConfig = &Config{
		SupabaseURL: os.Getenv("SUPABASE_URL"),
		SupabaseKey: os.Getenv("SUPABASE_KEY"),
	}

	// Fallback to VITE_ prefixed variables if standard ones are missing
	if AppConfig.SupabaseURL == "" {
		AppConfig.SupabaseURL = os.Getenv("VITE_SUPABASE_URL")
	}
	if AppConfig.SupabaseKey == "" {
		AppConfig.SupabaseKey = os.Getenv("VITE_SUPABASE_ANON_KEY")
	}

	if AppConfig.SupabaseURL == "" || AppConfig.SupabaseKey == "" {
		log.Fatal("SUPABASE_URL and SUPABASE_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) must be set in environment variables")
	}

	// Using anon key - RLS policies will enforce access control based on auth.uid() and user roles
	log.Println("🔑 Using Anon Key - RLS policies will enforce access control")

	var err error
	SupabaseClient, err = supabase.NewClient(AppConfig.SupabaseURL, AppConfig.SupabaseKey, nil)
	if err != nil {
		log.Fatalf("Failed to initialize Supabase client: %v", err)
	}
}
