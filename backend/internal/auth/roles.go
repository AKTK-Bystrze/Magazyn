package auth

import (
	"slices"
	"strings"

	"magazyn/backend/internal/types"
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
	return slices.ContainsFunc(allowedRoles, func(role string) bool {
		return strings.EqualFold(profile.Role, role)
	})
}
