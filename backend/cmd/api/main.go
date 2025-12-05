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

	// 3. Initialize Handlers
	authHandler := handler.NewAuthHandler(authService)

	// 4. Register Routes
	mux := http.NewServeMux()

	// Public Routes
	mux.HandleFunc("/auth/login", authHandler.HandleLogin)

	// Protected Routes
	// We wrap the handler function with the middleware
	mux.Handle("/auth/logout", middleware.AuthMiddleware(http.HandlerFunc(authHandler.HandleLogout)))
	mux.Handle("/auth/session", middleware.AuthMiddleware(http.HandlerFunc(authHandler.HandleGetSession)))

	// 5. Start Server
	port := ":8080"
	logger.Infof(ctx, "Server listening on port %s", port)
	if err := http.ListenAndServe(port, mux); err != nil {
		logger.Errorf(ctx, "Server failed to start: %v", err)
		os.Exit(1)
	}
}
