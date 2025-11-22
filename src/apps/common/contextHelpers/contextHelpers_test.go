package contextHelpers

import (
	"bystrze/apps/common/models"
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWithAndGetUserInfo(t *testing.T) {
	testUser := models.User{
		ID:    1,
		Name: "testuser",
		Role:  "user",
	}

	ctx := context.Background()
	ctxWithUser := WithUserInfo(ctx, testUser)

	retrievedUser, ok := GetUserInfo(ctxWithUser)
	require.True(t, ok, "GetUserInfo should return true")

	assert.Equal(t, testUser.ID, retrievedUser.ID, "Expected user ID to match")
	assert.Equal(t, testUser.Name, retrievedUser.Name, "Expected user name to match")
	assert.Equal(t, testUser.Role, retrievedUser.Role, "Expected user role to match")
}

func TestGetUserInfo_NoUserInContext(t *testing.T) {
	ctx := context.Background()
	_, ok := GetUserInfo(ctx)
	assert.False(t, ok, "GetUserInfo should return false for a context without a user")
}
