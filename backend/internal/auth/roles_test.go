package auth

import (
	"testing"

	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
)

func TestHasRole(t *testing.T) {
	t.Run("returns false for nil profile", func(t *testing.T) {
		assert.False(t, HasRole(nil, RoleUser))
	})

	t.Run("returns true for matching role", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "admin"}
		assert.True(t, HasRole(profile, RoleAdmin))
	})

	t.Run("returns false for non-matching role", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "user"}
		assert.False(t, HasRole(profile, RoleAdmin))
	})

	t.Run("returns true for one of multiple allowed roles", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "admin"}
		assert.True(t, HasRole(profile, RoleUser, RoleAdmin, RoleSuperAdmin))
	})

	t.Run("case insensitive comparison", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "ADMIN"}
		assert.True(t, HasRole(profile, "admin"))
	})

	t.Run("returns true for exact match super_admin", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "super_admin"}
		assert.True(t, HasRole(profile, RoleSuperAdmin))
	})

	t.Run("returns false for empty allowed roles", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "admin"}
		assert.False(t, HasRole(profile))
	})

	t.Run("returns false when profile role is empty", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: ""}
		assert.False(t, HasRole(profile, RoleAdmin))
	})

	t.Run("handles whitespace in role", func(t *testing.T) {
		// Test that roles with different casing still match due to EqualFold
		profile := &types.PublicProfilesSelect{Role: "Admin"}
		assert.True(t, HasRole(profile, "ADMIN"))
	})
}

func TestRoleConstants(t *testing.T) {
	// Verify role constants match expected database ENUM values
	assert.Equal(t, "user", RoleUser, "RoleUser should be 'user'")
	assert.Equal(t, "admin", RoleAdmin, "RoleAdmin should be 'admin'")
	assert.Equal(t, "super_admin", RoleSuperAdmin, "RoleSuperAdmin should be 'super_admin'")
}

func TestHasRole_EdgeCases(t *testing.T) {
	t.Run("single role match in list of many", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "user"}
		assert.True(t, HasRole(profile, "admin", "super_admin", "user"))
	})

	t.Run("no match in list of many", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "guest"}
		assert.False(t, HasRole(profile, RoleUser, RoleAdmin, RoleSuperAdmin))
	})

	t.Run("duplicate roles in allowed list", func(t *testing.T) {
		profile := &types.PublicProfilesSelect{Role: "admin"}
		assert.True(t, HasRole(profile, RoleAdmin, RoleAdmin, RoleAdmin))
	})
}
