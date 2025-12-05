package logger

import (
	"context"
	"magazyn/backend/internal/middleware"
	model "magazyn/backend/internal/types"
)

// Example 1: Logging without authentication (public endpoints)
func exampleUnauthenticatedLogging() {
	// For public endpoints like login, pass nil as context
	Info(nil, "User attempting to login")
	Warnf(nil, "Failed login attempt for email: %s", "user@example.com")
	Error(nil, "Rate limit exceeded for login attempts")
}

// Example 2: Logging with authenticated user (protected endpoints)
func exampleAuthenticatedLogging(ctx context.Context) {
	// The context contains user information from the middleware
	Info(ctx, "Processing user request")
	Debugf(ctx, "Request parameters: %v", map[string]string{"action": "fetch"})
	Warnf(ctx, "User approaching credit limit: %d credits remaining", 5)
	Errorf(ctx, "Failed to process request: %v", "database connection error")
}

// Example 3: Service method with logging
func exampleServiceMethod(ctx context.Context, equipmentId string) error {
	Infof(ctx, "Fetching equipment with ID: %s", equipmentId)
	
	// Simulate some processing
	// ...
	
	// Log success
	Debugf(ctx, "Equipment fetched successfully: %s", equipmentId)
	return nil
}

// Example 4: Creating a test context with mock user
func exampleTestContext() {
	// Create a mock user profile
	profile := &model.PublicProfilesSelect{
		Id:            "123e4567-e89b-12d3-a456-426614174000",
		Username:      "john_doe",
		Email:         "john@example.com",
		Role:          "user",
		CreditBalance: 100,
	}
	
	// Add profile to context
	ctx := context.WithValue(context.Background(), middleware.UserProfileContextKey, profile)
	
	// Now logging will show the username
	Info(ctx, "This log will show john_doe as the user")
	// Output: [2025-12-05 11:00:15] [INFO] [john_doe] This log will show john_doe as the user
}

// Example 5: Different log levels
func exampleLogLevels(ctx context.Context) {
	// DEBUG - for detailed debugging information
	Debug(ctx, "Entering function processPayment()")
	Debugf(ctx, "Payment details: amount=%d, method=%s", 100, "credit")
	
	// INFO - for general informational messages
	Info(ctx, "Payment processed successfully")
	Infof(ctx, "Order %s completed", "ORD-12345")
	
	// WARN - for warning messages
	Warn(ctx, "Payment processing took longer than expected")
	Warnf(ctx, "Retry attempt %d of %d", 2, 3)
	
	// ERROR - for error messages
	Error(ctx, "Payment gateway unavailable")
	Errorf(ctx, "Failed to process payment: %v", "timeout")
}



/*
Expected output examples:

Unauthenticated:
[2025-12-05 11:00:15] [INFO] [UNAUTHENTICATED] User attempting to login
[2025-12-05 11:00:16] [WARN] [UNAUTHENTICATED] Failed login attempt for email: user@example.com

Authenticated (username: john_doe):
[2025-12-05 11:00:17] [INFO] [john_doe] Processing user request
[2025-12-05 11:00:18] [DEBUG] [john_doe] Request parameters: map[action:fetch]
[2025-12-05 11:00:19] [WARN] [john_doe] User approaching credit limit: 5 credits remaining
[2025-12-05 11:00:20] [ERROR] [john_doe] Failed to process request: database connection error
*/
