// Package appcontext defines context key types and constants used to pass user and profile information through the request lifecycle.
package appcontext

// ContextKey represents a custom key type for storing values in context.Context.
type ContextKey string

// Context key constants for storing request-scoped values.
const (
	// UserContextKey stores the authenticated user (*types.User).
	UserContextKey ContextKey = "user"
	// UserProfileContextKey stores the user's profile (*types.PublicProfilesSelect).
	UserProfileContextKey ContextKey = "user_profile"
	// AccessTokenContextKey stores the JWT token for RLS enforcement.
	AccessTokenContextKey ContextKey = "access_token"
	// TraceIDContextKey stores the request trace ID.
	TraceIDContextKey ContextKey = "trace_id"
)
