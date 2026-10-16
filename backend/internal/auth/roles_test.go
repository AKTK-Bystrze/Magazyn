package auth

import (
	"testing"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
)

func TestHasRole(t *testing.T) {
	tests := []struct {
		name     string
		profile  *types.PublicProfilesSelect
		allowed  []string
		expected bool
	}{
		{"returns false for nil profile", nil, []string{RoleUser}, false},
		{"returns true for matching role", &types.PublicProfilesSelect{Role: "admin"}, []string{RoleAdmin}, true},
		{"returns false for non-matching role", &types.PublicProfilesSelect{Role: "user"}, []string{RoleAdmin}, false},
		{"returns true for one of multiple allowed roles", &types.PublicProfilesSelect{Role: "admin"}, []string{RoleUser, RoleAdmin, RoleSuperAdmin}, true},
		{"case insensitive comparison", &types.PublicProfilesSelect{Role: "ADMIN"}, []string{"admin"}, true},
		{"returns true for exact match super_admin", &types.PublicProfilesSelect{Role: "super_admin"}, []string{RoleSuperAdmin}, true},
		{"returns false for empty allowed roles", &types.PublicProfilesSelect{Role: "admin"}, nil, false},
		{"returns false when profile role is empty", &types.PublicProfilesSelect{Role: ""}, []string{RoleAdmin}, false},
		{"handles whitespace in role", &types.PublicProfilesSelect{Role: "Admin"}, []string{"ADMIN"}, true},
		{"single role match in list of many", &types.PublicProfilesSelect{Role: "user"}, []string{"admin", "super_admin", "user"}, true},
		{"no match in list of many", &types.PublicProfilesSelect{Role: "guest"}, []string{RoleUser, RoleAdmin, RoleSuperAdmin}, false},
		{"duplicate roles in allowed list", &types.PublicProfilesSelect{Role: "admin"}, []string{RoleAdmin, RoleAdmin, RoleAdmin}, true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.expected, HasRole(tt.profile, tt.allowed...))
		})
	}
}
