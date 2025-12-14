// Package main is the entry point for the Magazyn Backend API server.
// It initializes configuration, services, handlers, middleware, and routes for the equipment rental system.
package main

import (
	"context"
	"net/http"
	"os"
	"time"

	"magazyn/backend/internal/auth"
	"magazyn/backend/internal/config"
	authhandler "magazyn/backend/internal/handler/auth"
	calendarhandler "magazyn/backend/internal/handler/calendar"
	credithandler "magazyn/backend/internal/handler/credit"
	equipmenthandler "magazyn/backend/internal/handler/equipment"
	reservationhandler "magazyn/backend/internal/handler/reservation"
	userhandler "magazyn/backend/internal/handler/user"
	"magazyn/backend/internal/logger"
	authmiddleware "magazyn/backend/internal/middleware/auth"
	commonmiddleware "magazyn/backend/internal/middleware/common"
	supabaserepo "magazyn/backend/internal/repository/supabase"
	authservice "magazyn/backend/internal/service/auth"
	calendarservice "magazyn/backend/internal/service/calendar"
	creditservice "magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/service/email"
	equipmentservice "magazyn/backend/internal/service/equipment"
	reservationservice "magazyn/backend/internal/service/reservation"
	userservice "magazyn/backend/internal/service/user"
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

	if appState.Config.SupabaseServiceKey == "" {
		logger.Warn(ctx, "⚠️ SUPABASE_SERVICE_ROLE_KEY is not set. Admin user creation will fail.")
	} else {
		logger.Info(ctx, "✅ SUPABASE_SERVICE_ROLE_KEY loaded.")
	}

	// Initialize Repositories
	authRepo := supabaserepo.NewAuthRepository(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseKey, appState.Config.SupabaseServiceKey)
	equipmentRepo := supabaserepo.NewEquipmentRepository(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseServiceKey)
	equipmentTypeRepo := supabaserepo.NewEquipmentTypeRepository(appState.SupabaseClient)
	userRepo := supabaserepo.NewUserRepository(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseKey)
	reservationRepo := supabaserepo.NewReservationRepository(appState.SupabaseClient, appState.Config.SupabaseURL, appState.Config.SupabaseKey, appState.Config.SupabaseServiceKey)
	calendarRepo := supabaserepo.NewCalendarRepository(appState.SupabaseClient)
	analyticsRepo := supabaserepo.NewAnalyticsRepository(appState.SupabaseClient)
	creditRepo := supabaserepo.NewCreditHistoryRepository(appState.SupabaseClient)

	// Initialize Services
	authService := authservice.NewAuthService(authRepo)
	equipmentService := equipmentservice.NewEquipmentService(equipmentRepo, equipmentTypeRepo, appState.Config.SupabaseURL)
	userService := userservice.NewUserService(userRepo, authRepo)
	calendarService := calendarservice.NewCalendarService(calendarRepo, equipmentTypeRepo)
	analyticsService := calendarservice.NewAnalyticsService(analyticsRepo, equipmentTypeRepo)
	creditService := creditservice.NewCreditHistoryService(creditRepo, userRepo)

	emailService := email.NewNoopEmailService()
	reservationService := reservationservice.NewReservationService(reservationRepo, equipmentRepo, userRepo, emailService)

	// Initialize Handlers
	authHandler := authhandler.NewAuthHandler(authService)
	equipmentHandler := equipmenthandler.NewEquipmentHandler(equipmentService)
	userHandler := userhandler.NewUserHandler(userService)
	reservationHandler := reservationhandler.NewReservationHandler(reservationService)
	calendarHandler := calendarhandler.NewCalendarHandler(calendarService)
	analyticsHandler := calendarhandler.NewAnalyticsHandler(analyticsService)
	creditHandler := credithandler.NewCreditHistoryHandler(creditService)

	// Initialize Middleware
	authMiddleware := authmiddleware.NewAuthMiddleware(authRepo)

	mux := http.NewServeMux()

	mux.HandleFunc("POST /auth/login", authHandler.HandleLogin)

	mux.Handle("POST /auth/logout", authMiddleware(http.HandlerFunc(authHandler.HandleLogout)))
	mux.Handle("GET /auth/session", authMiddleware(http.HandlerFunc(authHandler.HandleGetSession)))

	// User Routes
	mux.Handle("GET /users/me", authMiddleware(http.HandlerFunc(userHandler.HandleGetProfile)))
	mux.Handle("GET /users", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(userHandler.HandleListUsers))))
	mux.Handle("POST /users", authMiddleware(authmiddleware.RequireRoles(auth.RoleSuperAdmin)(http.HandlerFunc(userHandler.HandleCreateUser))))
	mux.Handle("GET /users/{id}", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(userHandler.HandleGetProfile))))
	mux.Handle("PATCH /users/{id}", authMiddleware(authmiddleware.RequireRoles(auth.RoleSuperAdmin)(http.HandlerFunc(userHandler.HandleUpdateUser))))

	mux.Handle("GET /equipment", authMiddleware(http.HandlerFunc(equipmentHandler.HandleList)))
	mux.Handle("GET /equipment-types", authMiddleware(http.HandlerFunc(equipmentHandler.HandleListEquipmentTypes)))
	mux.Handle("POST /equipment-types", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleCreateEquipmentType))))

	mux.Handle("POST /equipment", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleCreate))))
	mux.Handle("GET /equipment/{id}", authMiddleware(http.HandlerFunc(equipmentHandler.HandleGetByID)))
	mux.Handle("PATCH /equipment/{id}", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleUpdate))))
	mux.Handle("DELETE /equipment/{id}", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(equipmentHandler.HandleArchive))))
	mux.Handle("GET /equipment/{id}/availability", authMiddleware(http.HandlerFunc(equipmentHandler.HandleCheckAvailability)))

	// Reservation Routes
	mux.Handle("GET /reservations", authMiddleware(http.HandlerFunc(reservationHandler.HandleList)))
	mux.Handle("POST /reservations", authMiddleware(http.HandlerFunc(reservationHandler.HandleCreate)))
	mux.Handle("GET /reservations/dashboard", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(reservationHandler.HandleDashboardStats))))
	mux.Handle("PATCH /reservations/bulk", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(reservationHandler.HandleBulkUpdate))))
	mux.Handle("GET /reservations/{id}", authMiddleware(http.HandlerFunc(reservationHandler.HandleGetByID)))
	mux.Handle("PATCH /reservations/{id}", authMiddleware(http.HandlerFunc(reservationHandler.HandleUpdate)))

	// Calendar Routes
	mux.Handle("GET /calendar/availability", authMiddleware(http.HandlerFunc(calendarHandler.HandleGetAvailability)))

	// Credit History Routes
	mux.Handle("GET /credit-history", authMiddleware(http.HandlerFunc(creditHandler.HandleGetCreditHistory)))

	// Analytics Routes (Admin only)
	mux.Handle("GET /analytics/equipment-stats", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(analyticsHandler.HandleGetEquipmentStats))))
	mux.Handle("GET /analytics/user-stats", authMiddleware(authmiddleware.RequireRoles(auth.RoleAdmin, auth.RoleSuperAdmin)(http.HandlerFunc(analyticsHandler.HandleGetUserStats))))

	port := ":" + appState.Config.Port
	logger.Infof(ctx, "Server listening on port %s", port)
	logger.Infof(ctx, "CORS allowed origins: %v", appState.Config.CORSAllowedOrigins)

	httpHandler := commonmiddleware.CORSMiddleware(appState.Config.CORSAllowedOrigins)(mux)

	server := &http.Server{
		Addr:         port,
		Handler:      httpHandler,
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	if err := server.ListenAndServe(); err != nil {
		logger.Errorf(ctx, "Server failed to start: %v", err)
		os.Exit(1)
	}
}
