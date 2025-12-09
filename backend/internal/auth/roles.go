// Package auth provides role-based access control utilities for the authentication system.
package auth

import (
	"magazyn/backend/internal/types"
	"strings"
)

// User role constants that match the database ENUM type.
// These roles define the permission levels in the system hierarchically:
// - user: basic access
// - admin: administrative access
// - super_admin: full system access
const (
	RoleUser       = "user"
	RoleAdmin      = "admin"
	RoleSuperAdmin = "super_admin"
)

// HasRole checks if a user profile has one of the specified allowed roles.
// It performs case-insensitive role comparison and returns true if the user's role matches any of the allowed roles.
// Returns false if the profile is nil or if the user's role doesn't match any allowed role.
func HasRole(profile *types.PublicProfilesSelect, allowedRoles ...string) bool {
	if profile == nil {
		return false
	}

	currentRole := string(profile.Role)

	for _, role := range allowedRoles {
		if strings.EqualFold(currentRole, role) {
			return true
		}
	}
	return false
}
