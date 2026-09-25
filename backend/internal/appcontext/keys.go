// These keys are used to pass user and profile information through the request lifecycle.
package appcontext

type ContextKey string

// Context key constants for storing user information in request contexts.
const (
	UserContextKey        ContextKey = "user"         // Stores the authenticated user (*types.User)
	UserProfileContextKey ContextKey = "user_profile" // Stores the user's profile (*types.PublicProfilesSelect)
	AccessTokenContextKey ContextKey = "access_token" // Stores the JWT token for RLS enforcement
	TraceIDContextKey     ContextKey = "trace_id"     // Stores the request trace ID
)
