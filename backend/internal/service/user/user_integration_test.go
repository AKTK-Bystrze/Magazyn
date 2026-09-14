//go:build integration

package user_test

import (
	"context"
	"encoding/json"
	"os"
	"testing"

	"magazyn/backend/internal/config"
	"magazyn/backend/internal/repository/supabase"
	"magazyn/backend/internal/service/credit"
	"magazyn/backend/internal/service/user"
	"magazyn/backend/internal/types"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	supa "github.com/supabase-community/supabase-go"
)

// ============================================================================
// Test Fixture
// ============================================================================

type userTestFixture struct {
	t       *testing.T
	svc     user.UserService
	credSvc credit.CreditHistoryService
	client  *supa.Client
	user1ID string
	user2ID string
	adminID string
	cleanup []func()
}

// setupUserTestFixture creates and initializes a new user-service test fixture.
// It loads config, sets up service and repository dependencies, fetches real users
// from the database, and resets their credit balances to a known state.
func setupUserTestFixture(t *testing.T) *userTestFixture {
	_ = os.Setenv("ENV_FILE_PATH", "../../../../.env")
	_, err := config.LoadConfig()
	require.NoError(t, err)

	supabaseURL := os.Getenv("PUBLIC_SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	if supabaseURL == "" || supabaseKey == "" {
		t.Skip("Skipping integration test: Supabase credentials not set")
	}

	client, err := supa.NewClient(supabaseURL, supabaseKey, nil)
	require.NoError(t, err)

	userRepo := supabase.NewUserRepository(client, supabaseURL, supabaseKey, supabaseKey)
	authRepo := supabase.NewAuthRepository(client, supabaseURL, supabaseKey, supabaseKey, "")
	creditRepo := supabase.NewCreditHistoryRepository(client, supabaseURL, supabaseKey)

	f := &userTestFixture{
		t:       t,
		svc:     user.NewUserService(userRepo, authRepo, creditRepo),
		credSvc: credit.NewCreditHistoryService(creditRepo, userRepo),
		client:  client,
		cleanup: []func(){},
	}

	// Fetch 2 non-admin users and 1 admin
	type profile struct {
		ID   string `json:"id"`
		Role string `json:"role"`
	}
	var profiles []profile
	data, _, err := client.From("profiles").Select("id,role", "exact", false).Limit(5, "").Execute()
	require.NoError(t, err)
	require.NoError(t, json.Unmarshal(data, &profiles))
	require.GreaterOrEqual(t, len(profiles), 2, "Need at least 2 users")

	for _, p := range profiles {
		if (p.Role == "admin" || p.Role == "superadmin") && f.adminID == "" {
			f.adminID = p.ID
		} else if f.user1ID == "" {
			f.user1ID = p.ID
		} else if f.user2ID == "" {
			f.user2ID = p.ID
		}
	}
	if f.adminID == "" {
		f.adminID = profiles[0].ID // fallback
	}

	// Reset balances to a known state
	_, _, _ = client.From("profiles").Update(map[string]interface{}{"credit_balance": int32(1000)}, "", "").Eq("id", f.user1ID).Execute()
	_, _, _ = client.From("profiles").Update(map[string]interface{}{"credit_balance": int32(1000)}, "", "").Eq("id", f.user2ID).Execute()

	return f
}

// teardown executes all registered cleanup functions in LIFO order.
func (f *userTestFixture) teardown() {
	for i := len(f.cleanup) - 1; i >= 0; i-- {
		f.cleanup[i]()
	}
}

// getUserBalance fetches the current credit balance for the specified user from the database.
func (f *userTestFixture) getUserBalance(userID string) int32 {
	type profile struct {
		CreditBalance int32 `json:"credit_balance"`
	}
	var profiles []profile
	data, _, err := f.client.From("profiles").Select("credit_balance", "exact", false).Eq("id", userID).Execute()
	require.NoError(f.t, err)
	require.NoError(f.t, json.Unmarshal(data, &profiles))
	require.NotEmpty(f.t, profiles)
	return profiles[0].CreditBalance
}

// ============================================================================
// TS-4 Tests
// ============================================================================

// TestTS4_BulkAdjustCredits_Integration verifies TS-4 steps 3-5:
// BulkAdjustCredits atomically adjusts credit balance for multiple users
// and creates credit_history entries with the given reason.
func TestTS4_BulkAdjustCredits_Integration(t *testing.T) {
	fixture := setupUserTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	balance1Before := fixture.getUserBalance(fixture.user1ID)
	balance2Before := fixture.getUserBalance(fixture.user2ID)

	err := fixture.svc.BulkAdjustCredits(ctx, fixture.adminID, types.BulkAdjustCreditsRequest{
		UserIDs:     []string{fixture.user1ID, fixture.user2ID},
		Amount:      -50,
		Reason:      "admin_adjustment",
		Description: "TS-4 integration: deduction test",
	})
	require.NoError(t, err)

	// Both balances reduced by 50
	assert.Equal(t, balance1Before-50, fixture.getUserBalance(fixture.user1ID), "User1 balance -50")
	assert.Equal(t, balance2Before-50, fixture.getUserBalance(fixture.user2ID), "User2 balance -50")

	// Credit history entries created for both users
	type entry struct {
		UserID string `json:"user_id"`
	}
	var entries []entry
	data, _, _ := fixture.client.From("credit_history").
		Select("user_id", "exact", false).
		Eq("reason", "admin_adjustment").
		In("user_id", []string{fixture.user1ID, fixture.user2ID}).
		Execute()
	_ = json.Unmarshal(data, &entries)
	assert.GreaterOrEqual(t, len(entries), 2, "Should have history entry for each user")
	t.Logf("✓ TS-4: BulkAdjustCredits deducted 50 from 2 users, history created")

	// Teardown: restore balances
	fixture.cleanup = append(fixture.cleanup, func() {
		_, _, _ = fixture.client.From("profiles").Update(map[string]interface{}{"credit_balance": balance1Before}, "", "").Eq("id", fixture.user1ID).Execute()
		_, _, _ = fixture.client.From("profiles").Update(map[string]interface{}{"credit_balance": balance2Before}, "", "").Eq("id", fixture.user2ID).Execute()
	})
}

// TestTS4_SetExactCreditBalance_Integration verifies TS-4 step 2 (set exact value):
// UpdateUser can set a user's credit_balance to a precise value.
func TestTS4_SetExactCreditBalance_Integration(t *testing.T) {
	fixture := setupUserTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	exactBalance := int32(777)
	resp, err := fixture.svc.UpdateUser(ctx, fixture.user1ID, types.UpdateUserRequest{
		CreditBalance: &exactBalance,
	})
	require.NoError(t, err)
	assert.Equal(t, exactBalance, resp.CreditBalance, "Credit balance should be set to exact value")
	assert.Equal(t, exactBalance, fixture.getUserBalance(fixture.user1ID), "DB balance must match")
	t.Logf("✓ TS-4: Exact balance set to %d", exactBalance)

	// Restore
	fixture.cleanup = append(fixture.cleanup, func() {
		_, _, _ = fixture.client.From("profiles").Update(map[string]interface{}{"credit_balance": int32(1000)}, "", "").Eq("id", fixture.user1ID).Execute()
	})
}

// TestTS4_UserSeesAdjustedBalance_Integration verifies TS-4 step 6:
// After admin adjusts credits, the user's credit history reflects the change
// with the correct reason and amount.
func TestTS4_UserSeesAdjustedBalance_Integration(t *testing.T) {
	fixture := setupUserTestFixture(t)
	defer fixture.teardown()
	ctx := context.Background()

	// Admin adds 200 credits with a reason
	err := fixture.svc.BulkAdjustCredits(ctx, fixture.adminID, types.BulkAdjustCreditsRequest{
		UserIDs:     []string{fixture.user1ID},
		Amount:      200,
		Reason:      "work_credit",
		Description: "TS-4: reward for warehouse cleanup",
	})
	require.NoError(t, err)

	// User fetches their own history
	targetID := fixture.user1ID
	resp, err := fixture.credSvc.GetCreditHistory(ctx, types.GetCreditHistoryQuery{
		UserID:  &targetID,
		Page:    1,
		PerPage: 10,
	}, fixture.user1ID)
	require.NoError(t, err)

	// Find the work_credit entry
	found := false
	for _, entry := range resp.CreditHistory {
		if entry.Reason == "work_credit" && entry.Amount == 200 {
			found = true
			break
		}
	}
	assert.True(t, found, "User should see the admin-applied 200-credit work_credit entry in their history")
	t.Logf("✓ TS-4: User sees admin credit adjustment in credit history")

	// Restore balance
	fixture.cleanup = append(fixture.cleanup, func() {
		_, _, _ = fixture.client.From("profiles").Update(map[string]interface{}{"credit_balance": int32(1000)}, "", "").Eq("id", fixture.user1ID).Execute()
	})
}
