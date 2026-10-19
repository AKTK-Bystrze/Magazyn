//go:build integration

package auth_test

import (
	"context"
	"fmt"
	"magazyn/backend/internal/repository/supabase"
	"magazyn/backend/internal/service/auth"
	"magazyn/backend/internal/testutils"
	"magazyn/backend/internal/types"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMain(m *testing.M) {
	if _, err := testutils.SetupIntegrationTest(); err != nil {
		fmt.Printf("Skipping integration tests: %v\n", err)
		return
	}
	m.Run()
}
func TestGetSession_Integration(t *testing.T) {
	url := os.Getenv("PUBLIC_SUPABASE_URL")
	key := os.Getenv("PUBLIC_SUPABASE_ANON_KEY")
	serviceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	appURL := os.Getenv("PUBLIC_APP_URL")
	repo := supabase.NewAuthRepository(testutils.TestClient, url, key, serviceKey, appURL)
	service := auth.NewAuthService(repo)
	email := fmt.Sprintf("test_session_%d@example.com", time.Now().Unix())
	password := "testRequest123!"
	user, err := testutils.CreateTestUser(email, password)
	if err != nil {
		t.Logf("Failed to create test user (requires service role key): %v", err)
		t.Skip("Skipping test due to user creation failure")
		return
	}
	defer func() {
		testutils.DeleteTestUser(user.ID.String())
	}()
	t.Run("returns session for existing user", func(t *testing.T) {
		// Profile creation happens via trigger on auth.users insert
		var session *types.SessionResponse
		require.Eventually(t, func() bool {
			var err error
			session, err = service.GetSession(context.Background(), user.ID.String(), "test-token")
			return err == nil && session != nil
		}, 3*time.Second, 100*time.Millisecond)
		assert.NotNil(t, session)
		assert.Equal(t, user.ID.String(), session.UserID)
		assert.Equal(t, email, session.Email)
	})
	t.Run("returns error for non-existent user", func(t *testing.T) {
		session, err := service.GetSession(context.Background(), "00000000-0000-0000-0000-000000000000", "test-token")
		assert.Error(t, err)
		assert.Nil(t, session)
		assert.Equal(t, "profile not found", err.Error())
	})
}
