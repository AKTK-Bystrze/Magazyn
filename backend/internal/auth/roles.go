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
