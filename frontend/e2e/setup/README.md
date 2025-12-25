# E2E Test Setup Scripts

## test-users.sql

SQL script to set up E2E test user profiles in Supabase.

### Usage

1. **Create auth users first** in Supabase Auth (Dashboard → Authentication → Users):
   - `test.dev.g6@gmail.com` (password: `TestSecurePassword123!`)
   - `test.admin.g6@gmail.com` (password: `TestSecurePassword123!`)
   - `test.superadmin.g6@gmail.com` (password: `TestSecurePassword123!`)
   - Enable "Auto Confirm User" when creating

2. **Run script** in Supabase SQL Editor:
   - Copy entire contents of `test-users.sql`
   - Execute in SQL Editor
   - Verify 3 users appear in verification query results

### What it does

- Creates/updates profiles for all 3 test users
- Sets correct roles: user, admin, super_admin
- Ensures `is_enabled = true`
- Sets initial `credit_balance = 100`
- Idempotent (safe to run multiple times)

---

For full E2E testing documentation, see [`../docs/e2e-testing.md`](../docs/e2e-testing.md)
