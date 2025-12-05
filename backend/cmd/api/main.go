package main

import (
	"context"
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
	authService := service.NewAuthService()
	equipmentService, err := service.NewEquipmentService(config.AppConfig.SupabaseURL, config.AppConfig.SupabaseKey)
	if err != nil {
		logger.Errorf(ctx, "Failed to initialize equipment service: %v", err)
		os.Exit(1)
	}

	// 3. Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)
	equipmentHandler := handler.NewEquipmentHandler(equipmentService)

	// 4. Register Routes
	mux := http.NewServeMux()

	// Public Routes
	mux.HandleFunc("POST /auth/login", authHandler.HandleLogin)

	// Protected Routes (Authentication)
	// We wrap the handler function with the middleware
	mux.Handle("POST /auth/logout", middleware.AuthMiddleware(http.HandlerFunc(authHandler.HandleLogout)))
	mux.Handle("GET /auth/session", middleware.AuthMiddleware(http.HandlerFunc(authHandler.HandleGetSession)))

	// Protected Routes (Equipment)
	// Note: Role checks (Authorization) should ideally be inside the handler or a separate middleware.
	// For now, minimal RBAC inside Create/Update/Delete handlers or implied admin access checks in service will be used.
	mux.Handle("GET /equipment", middleware.AuthMiddleware(http.HandlerFunc(equipmentHandler.HandleList)))
	mux.Handle("POST /equipment", middleware.AuthMiddleware(http.HandlerFunc(equipmentHandler.HandleCreate)))
	mux.Handle("GET /equipment/{id}", middleware.AuthMiddleware(http.HandlerFunc(equipmentHandler.HandleGetByID)))
	mux.Handle("PATCH /equipment/{id}", middleware.AuthMiddleware(http.HandlerFunc(equipmentHandler.HandleUpdate)))
	mux.Handle("DELETE /equipment/{id}", middleware.AuthMiddleware(http.HandlerFunc(equipmentHandler.HandleArchive)))
	mux.Handle("GET /equipment/{id}/availability", middleware.AuthMiddleware(http.HandlerFunc(equipmentHandler.HandleCheckAvailability)))

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
