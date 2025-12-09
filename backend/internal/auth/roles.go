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

	currentRole := string(profile.Role)

	for _, role := range allowedRoles {
		if strings.EqualFold(currentRole, role) {
			return true
		}
	}
	return false
}
