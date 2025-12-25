# Backend Logger

A context-aware logger for the Magazyn backend that automatically includes authenticated user information in log messages.

## Features

- **User Context Logging**: Automatically logs the authenticated username at the beginning of each log entry
- **Unauthenticated Detection**: Shows `[UNAUTHENTICATED]` when no user is authenticated
- **Multiple Log Levels**: Supports DEBUG, INFO, WARN, and ERROR levels
- **Formatted Output**: Includes timestamp, log level, username, and message
- **Easy Integration**: Works seamlessly with the existing auth middleware

## Log Format

```
[YYYY-MM-DD HH:MM:SS] [LEVEL] [USERNAME] Message
```

Examples:
```
[2025-12-05 11:00:15] [INFO] [john_doe] Fetching session information
[2025-12-05 11:00:16] [ERROR] [UNAUTHENTICATED] Failed to send magic link
[2025-12-05 11:00:17] [WARN] [admin_user] Profile not found for user abc123
```

## Usage

### Import the Logger

```go
import "magazyn/backend/internal/logger"
```

### Basic Logging

The logger requires a `context.Context` as the first parameter to extract user information:

```go
// Info level
logger.Info(ctx, "User action completed successfully")

// Warning level
logger.Warn(ctx, "Resource limit approaching")

// Error level
logger.Error(ctx, "Failed to process request")

// Debug level (for development)
logger.Debug(ctx, "Detailed debugging information")
```

### Formatted Logging

Use the `*f` variants for formatted messages:

```go
logger.Infof(ctx, "Processing order %s for user %s", orderId, userId)
logger.Errorf(ctx, "Failed to fetch profile for user %s: %v", userId, err)
logger.Warnf(ctx, "Retry attempt %d of %d", attempt, maxAttempts)
logger.Debugf(ctx, "Request payload: %+v", payload)
```

### Unauthenticated Requests

For endpoints that don't require authentication (like login), pass `nil` as the context:

```go
logger.Info(nil, "Login attempt for email: user@example.com")
// Output: [2025-12-05 11:00:15] [INFO] [UNAUTHENTICATED] Login attempt for email: user@example.com
```

### Authenticated Requests

For protected endpoints, pass the request context which contains user information:

```go
func (s *AuthService) GetSession(ctx context.Context, userId string) (*SessionResponse, error) {
    logger.Info(ctx, "Fetching session information")
    // The logger will automatically extract the username from the context
    // Output: [2025-12-05 11:00:15] [INFO] [john_doe] Fetching session information
    
    // ... rest of the code
}
```

## How It Works

1. **Middleware Integration**: The `AuthMiddleware` fetches the user profile from the database and stores it in the request context
2. **Context Extraction**: The logger extracts the user profile from the context
3. **Username Logging**: If a profile is found, the username is logged; otherwise, `[UNAUTHENTICATED]` or `[AUTHENTICATED]` is shown

## Context Keys

The logger uses the following context keys defined in the middleware:

- `UserContextKey`: Stores the authenticated user from Supabase
- `UserProfileContextKey`: Stores the user profile from the database (includes username)

## Log Levels

- **DEBUG**: Detailed information for debugging purposes
- **INFO**: General informational messages about application flow
- **WARN**: Warning messages for potentially problematic situations
- **ERROR**: Error messages for failures and exceptions

## Best Practices

1. **Always pass context**: For authenticated endpoints, always pass `r.Context()` to the logger
2. **Use appropriate levels**: 
   - Use INFO for normal operations
   - Use WARN for recoverable issues
   - Use ERROR for failures
   - Use DEBUG only during development
3. **Include relevant details**: Add context-specific information in log messages
4. **Avoid sensitive data**: Don't log passwords, tokens, or other sensitive information
5. **Use formatted logging**: Prefer `Infof`, `Errorf`, etc. for dynamic messages

## Example: Complete Service Method

```go
func (s *EquipmentService) GetEquipment(ctx context.Context, id string) (*Equipment, error) {
    logger.Infof(ctx, "Fetching equipment with ID: %s", id)
    
    var equipment []model.PublicEquipmentSelect
    _, err := config.SupabaseClient.From("equipment").
        Select("*", "exact", false).
        Eq("id", id).
        ExecuteTo(&equipment)
    
    if err != nil {
        logger.Errorf(ctx, "Database error while fetching equipment %s: %v", id, err)
        return nil, fmt.Errorf("failed to fetch equipment: %w", err)
    }
    
    if len(equipment) == 0 {
        logger.Warnf(ctx, "Equipment not found: %s", id)
        return nil, errors.New("equipment not found")
    }
    
    logger.Debugf(ctx, "Equipment fetched successfully: %+v", equipment[0])
    return &equipment[0], nil
}
```

## Testing

When testing, you can create a context with mock user data:

```go
import (
    "context"
    "magazyn/backend/internal/middleware"
    model "magazyn/backend/internal/types"
)

func TestWithMockUser() {
    profile := &model.PublicProfilesSelect{
        Username: "test_user",
        Email:    "test@example.com",
    }
    
    ctx := context.WithValue(context.Background(), middleware.UserProfileContextKey, profile)
    logger.Info(ctx, "Test message")
    // Output: [timestamp] [INFO] [test_user] Test message
}
```
