// Package main is the entry point for the Magazyn Backend API server.
// It initializes configuration, services, handlers, middleware, and routes for the equipment rental system.
package main

import (
	"context"
	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/config"
	authhandler "magazyn/backend/internal/handler/auth"
	equipmenthandler "magazyn/backend/internal/handler/equipment"
	"magazyn/backend/internal/logger"
	authmiddleware "magazyn/backend/internal/middleware/auth"
	commonmiddleware "magazyn/backend/internal/middleware/common"
	supabaserepo "magazyn/backend/internal/repository/supabase"
	authservice "magazyn/backend/internal/service/auth"
	equipmentservice "magazyn/backend/internal/service/equipment"
	"net/http"
	"os"
)

func main() {
	ctx := context.Background()
	logger.Info(ctx, "Starting Magazyn Backend API...")

	appState, err := config.LoadConfig()
	if err != nil {
		logger.Errorf(ctx, "Failed to load configuration: %v", err)
		os.Exit(1)
	}

	logger.SetMinLevel(appState.Config.LogLevel)
	logger.Infof(ctx, "Log level set to: %s", appState.Config.LogLevel)

    // Initialize Repositories
    authRepo := supabaserepo.NewAuthRepository(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseKey)
	equipmentRepo := supabaserepo.NewEquipmentRepository(appState.SupabaseClient)
	equipmentTypeRepo := supabaserepo.NewEquipmentTypeRepository(appState.SupabaseClient)

    // Initialize Services
	authService := authservice.NewAuthService(authRepo)
	equipmentService := equipmentservice.NewEquipmentService(equipmentRepo, equipmentTypeRepo, appState.Config.SupabaseURL)

    // Initialize Handlers
	authHandler := authhandler.NewAuthHandler(authService)
	equipmentHandler := equipmenthandler.NewEquipmentHandler(equipmentService)

    // Initialize Middleware
	authMiddleware := authmiddleware.NewAuthMiddleware(authRepo)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /auth/login", authHandler.HandleLogin)

	mux.Handle("POST /auth/logout", authMiddleware(http.HandlerFunc(authHandler.HandleLogout)))
	mux.Handle("GET /auth/session", authMiddleware(http.HandlerFunc(authHandler.HandleGetSession)))

	mux.Handle("GET /equipment", authMiddleware(http.HandlerFunc(equipmentHandler.HandleList)))
	mux.Handle("GET /equipment-types", authMiddleware(http.HandlerFunc(equipmentHandler.HandleListEquipmentTypes)))

	mux.Handle("POST /equipment", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleCreate))))
	mux.Handle("GET /equipment/{id}", authMiddleware(http.HandlerFunc(equipmentHandler.HandleGetByID)))
	mux.Handle("PATCH /equipment/{id}", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleUpdate))))
	mux.Handle("DELETE /equipment/{id}", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleArchive))))
	mux.Handle("GET /equipment/{id}/availability", authMiddleware(http.HandlerFunc(equipmentHandler.HandleCheckAvailability)))

	port := ":" + appState.Config.Port
	logger.Infof(ctx, "Server listening on port %s", port)
	logger.Infof(ctx, "CORS allowed origins: %v", appState.Config.CORSAllowedOrigins)

	httpHandler := commonmiddleware.CORSMiddleware(appState.Config.CORSAllowedOrigins)(mux)

	if err := http.ListenAndServe(port, httpHandler); err != nil {
		logger.Errorf(ctx, "Server failed to start: %v", err)
		os.Exit(1)
	}
}
