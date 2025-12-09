// Package appcontext defines context keys for storing request-scoped values.
// These keys are used to pass user and profile information through the request lifecycle.
package appcontext

// ContextKey is a type for context keys to avoid conflicts with other packages using context values.
type ContextKey string

// Context key constants for storing user information in request contexts.
const (
	UserContextKey        ContextKey = "user"         // Stores the authenticated user (*types.User)
	UserProfileContextKey ContextKey = "user_profile" // Stores the user's profile (*types.PublicProfilesSelect)
)
