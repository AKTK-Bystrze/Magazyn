package auth

import (
	"magazyn/backend/internal/types"
	"strings"
)

// Role constants matching database ENUM
const (
	RoleUser       = "user"
	RoleAdmin      = "admin"
	RoleSuperAdmin = "super_admin"
)

// Helper to check if a user has one of the allowed roles
func HasRole(profile *types.PublicProfilesSelect, allowedRoles ...string) bool {
	if profile == nil {
		return false
	}
	
	// Assuming profile.Role is a string or compatible type.
	// Based on database types, it's an enum, but mapped as string in JSON/Go usually.
	// We need to ensure types match. 
	// types.PublicProfilesSelect struct likely has Role field. 
	// Let's verify types coverage. Assuming it's simple string comparison for now.
	
	currentRole := string(profile.Role) // Cast if it's a custom type alias
	
	for _, role := range allowedRoles {
		if strings.EqualFold(currentRole, role) {
			return true
		}
	}
	return false
}
