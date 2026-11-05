---
description: How to create pull requests
globs:
  alwaysApply: false
---

# PR Titles

## Format
All commit messages and PR titles MUST follow Conventional Commits format: see [Commit Messages Workflow](file:///e:/bystrze/Magazyn-reservation-lifecycle/.agent/workflows/commit-messages.md).

## Testing PR Titles Locally

Before opening a PR, validate your title:

```bash
cd frontend

# Test valid title
echo "feat: add new feature" | npx commitlint

# Test invalid title
echo "Updated stuff" | npx commitlint
```

## Common Mistakes to Avoid

❌ **Don't capitalize the description:**
```
feat: Add new feature  ← WRONG
feat: add new feature  ← CORRECT
```

❌ **Don't use multiple types:**
```
feat/fix: add feature and fix bug  ← WRONG
feat: add feature and fix related bug  ← CORRECT (choose primary change)
```

❌ **Don't use invalid types:**
```
update: add feature  ← WRONG (not a valid type)
feat: add feature    ← CORRECT
```

❌ **Don't skip the description:**
```
feat:  ← WRONG
feat: add calendar view  ← CORRECT
```


❌ **Don't describe obligatory testing in PR description:**
Skip testing section or describe only unusual approaches like manual or server testing.

```
Testing & Verification
Unit tests: 37 test files, 294 tests passed, 0 failures.
Concurrency & grace-cache unit tests added in session-refresh.test.ts.
Middleware resilience tests added in index.test.ts.
Prettier, ESLint, and astro build all passed cleanly.
  ← WRONG

Testing & Verification
Local Migration Replay: Replayed all 10 migrations cleanly via npx supabase db reset.
  ← CORRECT
```

## PR Title = Squash Commit Message

Since we use **squash merge**, the PR title becomes the final commit message.
Make your PR title descriptive and follow this format!

**The PR title should summarize ALL changes in the PR, not just the first commit.**


## Enforcement

- **CI validates PR titles** automatically on every pull request
- **Commitlint validates local commits** via husky git hooks
- Both use the same rules defined in `frontend/commitlint.config.js`
