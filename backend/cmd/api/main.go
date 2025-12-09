// Package main is the entry point for the Magazyn Backend API server.
// It initializes configuration, services, handlers, middleware, and routes for the equipment rental system.
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

	appState, err := config.LoadConfig()
	if err != nil {
		logger.Errorf(ctx, "Failed to load configuration: %v", err)
		os.Exit(1)
	}

	logger.SetMinLevel(appState.Config.LogLevel)
	logger.Infof(ctx, "Log level set to: %s", appState.Config.LogLevel)

	authAdapter := service.NewSupabaseAuthAdapter(appState.SupabaseClient)
	dbAdapter := service.NewSupabaseDBAdapter(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseKey)
	authService := service.NewAuthService(authAdapter, dbAdapter)
	equipmentService, err := service.NewEquipmentService(appState.Config.SupabaseURL, appState.Config.SupabaseKey)
	if err != nil {
		logger.Errorf(ctx, "Failed to initialize equipment service: %v", err)
		os.Exit(1)
	}

	authHandler := handler.NewAuthHandler(authService)
	equipmentHandler := handler.NewEquipmentHandler(equipmentService)

	authMiddleware := middleware.NewAuthMiddleware(authAdapter, dbAdapter)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /auth/login", authHandler.HandleLogin)

	mux.Handle("POST /auth/logout", authMiddleware(http.HandlerFunc(authHandler.HandleLogout)))
	mux.Handle("GET /auth/session", authMiddleware(http.HandlerFunc(authHandler.HandleGetSession)))

	mux.Handle("GET /equipment", authMiddleware(http.HandlerFunc(equipmentHandler.HandleList)))

	mux.Handle("POST /equipment", authMiddleware(middleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleCreate))))
	mux.Handle("GET /equipment/{id}", authMiddleware(http.HandlerFunc(equipmentHandler.HandleGetByID)))
	mux.Handle("PATCH /equipment/{id}", authMiddleware(middleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleUpdate))))
	mux.Handle("DELETE /equipment/{id}", authMiddleware(middleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleArchive))))
	mux.Handle("GET /equipment/{id}/availability", authMiddleware(http.HandlerFunc(equipmentHandler.HandleCheckAvailability)))

	port := ":" + appState.Config.Port
	logger.Infof(ctx, "Server listening on port %s", port)
	logger.Infof(ctx, "CORS allowed origins: %v", appState.Config.CORSAllowedOrigins)

	httpHandler := middleware.CORSMiddleware(appState.Config.CORSAllowedOrigins)(mux)

	if err := http.ListenAndServe(port, httpHandler); err != nil {
		logger.Errorf(ctx, "Server failed to start: %v", err)
		os.Exit(1)
	}
}
