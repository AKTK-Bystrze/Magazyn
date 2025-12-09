//go:build integration

package middleware

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"magazyn/backend/internal/appcontext"
	"magazyn/backend/internal/service"
	"magazyn/backend/internal/testutils"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	gotrueTypes "github.com/supabase-community/gotrue-go/types"
)

func TestMain(m *testing.M) {
	if err := testutils.SetupIntegrationTest(); err != nil {
		fmt.Printf("Skipping integration tests: %v\n", err)
		return
	}
	m.Run()
}

func TestAuthMiddleware_Integration(t *testing.T) {
	// Create a unique user for this test
	email := fmt.Sprintf("test_mid_%d@example.com", time.Now().Unix())
	password := "testMid123!"

	user, err := testutils.CreateTestUser(email, password)
	if err != nil {
		t.Logf("Failed to create test user: %v", err)
		t.Skip("Skipping test due to user creation failure")
		return
	}
	defer func() {
		// Clean up
		testutils.DeleteTestUser(user.ID.String())
	}()

	// Login to get a valid token
	tokenResp, err := testutils.TestClient.Auth.SignInWithEmailPassword(email, password)
	require.NoError(t, err, "Failed to sign in test user")
	validToken := tokenResp.AccessToken

	// Wait for profile trigger
	time.Sleep(1 * time.Second)

	t.Run("valid token populates context", func(t *testing.T) {
		var capturedUser *gotrueTypes.User
		var capturedProfile *types.PublicProfilesSelect

		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			capturedUser, _ = r.Context().Value(appcontext.UserContextKey).(*gotrueTypes.User)
			capturedProfile, _ = r.Context().Value(appcontext.UserProfileContextKey).(*types.PublicProfilesSelect)
			w.WriteHeader(http.StatusOK)
		})

		authAdapter := service.NewSupabaseAuthAdapter(testutils.TestClient)
		// Get config from environment
		url := os.Getenv("SUPABASE_URL")
		if url == "" {
			url = os.Getenv("VITE_SUPABASE_URL")
		}
		key := os.Getenv("SUPABASE_KEY")
		if key == "" {
			key = os.Getenv("VITE_SUPABASE_ANON_KEY")
		}
		dbAdapter := service.NewSupabaseDBAdapter(testutils.TestClient, url, key)
		middleware := NewAuthMiddleware(authAdapter, dbAdapter)(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer "+validToken)
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusOK, w.Code)
		assert.NotNil(t, capturedUser, "User should be in context")
		if capturedUser != nil {
			assert.Equal(t, user.ID.String(), capturedUser.ID.String())
		}

		assert.NotNil(t, capturedProfile, "Profile should be in context")
		if capturedProfile != nil {
			assert.Equal(t, user.ID.String(), capturedProfile.Id)
			assert.Equal(t, email, capturedProfile.Email)
		}
	})

	t.Run("invalid token returns 401", func(t *testing.T) {
		next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			t.Error("Next handler should not be called")
		})

		authAdapter := service.NewSupabaseAuthAdapter(testutils.TestClient)
		// Get config from environment
		url := os.Getenv("SUPABASE_URL")
		if url == "" {
			url = os.Getenv("VITE_SUPABASE_URL")
		}
		key := os.Getenv("SUPABASE_KEY")
		if key == "" {
			key = os.Getenv("VITE_SUPABASE_ANON_KEY")
		}
		dbAdapter := service.NewSupabaseDBAdapter(testutils.TestClient, url, key)
		middleware := NewAuthMiddleware(authAdapter, dbAdapter)(next)
		req := httptest.NewRequest(http.MethodGet, "/protected", nil)
		req.Header.Set("Authorization", "Bearer invalid-token.signature")
		w := httptest.NewRecorder()

		middleware.ServeHTTP(w, req)

		assert.Equal(t, http.StatusUnauthorized, w.Code)
		assert.Contains(t, w.Body.String(), "Invalid or expired token")
	})
}
