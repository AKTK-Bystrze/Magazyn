package contextHelpers

import (
	"bystrze/apps/common/models"
	"context"
	"testing"
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
	if !ok {
		t.Fatal("GetUserInfo should return true, but it returned false")
	}

	if retrievedUser.ID != testUser.ID {
		t.Errorf("Expected user ID to be %d, but got %d", testUser.ID, retrievedUser.ID)
	}

	if retrievedUser.Name != testUser.Name {
		t.Errorf("Expected user name to be %s, but got %s", testUser.Name, retrievedUser.Name)
	}

	if retrievedUser.Role != testUser.Role {
		t.Errorf("Expected user role to be %s, but got %s", testUser.Role, retrievedUser.Role)
	}
}

func TestGetUserInfo_NoUserInContext(t *testing.T) {
	ctx := context.Background()
	_, ok := GetUserInfo(ctx)
	if ok {
		t.Fatal("GetUserInfo should return false, but it returned true")
	}
}
