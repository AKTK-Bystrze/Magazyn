package main

import (
	"context"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/config"
	"magazyn/backend/internal/handler"
	"magazyn/backend/internal/logger"
	"magazyn/backend/internal/middleware"
	"magazyn/backend/internal/service"
	"net/http"
	"os"
)

func main() {
	ctx := context.Background()
	logger.Info(ctx, "Starting Magazyn Backend API...")

	// 1. Load Configuration
	config.LoadConfig()

	// 2. Initialize Services
	// AuthService now requires Supabase Auth Client and DB Client (Postgrest) wrapped in adapters
	authAdapter := service.NewSupabaseAuthAdapter(config.SupabaseClient)
	dbAdapter := service.NewSupabaseDBAdapter(config.SupabaseClient, config.AppConfig.SupabaseURL, config.AppConfig.SupabaseKey)
	authService := service.NewAuthService(authAdapter, dbAdapter)
	equipmentService, err := service.NewEquipmentService(config.AppConfig.SupabaseURL, config.AppConfig.SupabaseKey)
	if err != nil {
		logger.Errorf(ctx, "Failed to initialize equipment service: %v", err)
		os.Exit(1)
	}

	// 3. Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	equipmentHandler := handler.NewEquipmentHandler(equipmentService)

	// Initialize Middleware with dependencies
	authMiddleware := middleware.NewAuthMiddleware(authAdapter, dbAdapter)

	// 4. Register Routes
	mux := http.NewServeMux()

	// Public Routes
	mux.HandleFunc("POST /auth/login", authHandler.HandleLogin)

	// Protected Routes (Authentication)
	// We wrap the handler function with the middleware
	mux.Handle("POST /auth/logout", authMiddleware(http.HandlerFunc(authHandler.HandleLogout)))
	mux.Handle("GET /auth/session", authMiddleware(http.HandlerFunc(authHandler.HandleGetSession)))

	// Protected Routes (Equipment)
	// Role checks for modification endpoints
	mux.Handle("GET /equipment", authMiddleware(http.HandlerFunc(equipmentHandler.HandleList)))

	// Admin/SuperAdmin only routes
	mux.Handle("POST /equipment", authMiddleware(middleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleCreate))))
	mux.Handle("GET /equipment/{id}", authMiddleware(http.HandlerFunc(equipmentHandler.HandleGetByID)))
	mux.Handle("PATCH /equipment/{id}", authMiddleware(middleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleUpdate))))
	mux.Handle("DELETE /equipment/{id}", authMiddleware(middleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleArchive))))
	mux.Handle("GET /equipment/{id}/availability", authMiddleware(http.HandlerFunc(equipmentHandler.HandleCheckAvailability)))

	// 5. Start Server
	port := ":8080"
	logger.Infof(ctx, "Server listening on port %s", port)

	// Wrap mux with CORS middleware
	handler := middleware.CORSMiddleware(mux)

	if err := http.ListenAndServe(port, handler); err != nil {
		logger.Errorf(ctx, "Server failed to start: %v", err)
		os.Exit(1)
	}
}
