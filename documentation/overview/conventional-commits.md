# Conventional Commits Guide

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages and PR titles.

## Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

**Examples:**
- `feat: add calendar view`
- `fix(backend): correct credit calculation`
- `docs: update API documentation`

## Commit Types & When to Use Them

| Type | Version Bump | When to Use | Example |
|------|--------------|-------------|---------|
| `feat:` | Minor (v1.0.0 → v1.1.0) | New feature, enhancement, or capability | `feat: add calendar view`<br>`feat(auth): implement 2FA` |
| `fix:` | Patch (v1.0.0 → v1.0.1) | Bug fix, error correction | `fix: resolve login redirect`<br>`fix(backend): correct credit calc` |
| `docs:` | No release | Documentation only changes | `docs: update API guide`<br>`docs(setup): add Docker instructions` |
| `style:` | No release | Code style/formatting (no logic change) | `style: format code with prettier`<br>`style: fix indentation` |
| `refactor:` | No release | Code restructuring (no feature/bug change) | `refactor: extract auth service`<br>`refactor(ui): simplify component` |
| `perf:` | Patch (v1.0.0 → v1.0.1) | Performance improvements | `perf: optimize database queries`<br>`perf(frontend): lazy load images` |
| `test:` | No release | Adding or updating tests | `test: add unit tests for auth`<br>`test(e2e): add reservation flow` |
| `build:` | No release | Build system or dependencies | `build: update webpack config`<br>`build: upgrade to React 19` |
| `ci:` | No release | CI/CD configuration changes | `ci: add PR title validation`<br>`ci: optimize workflow caching` |
| `chore:` | No release | Maintenance tasks, tooling | `chore: update dependencies`<br>`chore: clean up old files` |
| `revert:` | Depends on reverted commit | Reverting a previous commit | `revert: remove feature X` |

**Common scopes:**
- `auth`, `ui`, `backend`, `frontend`, `api`, `db`, `e2e`, `ci`, `docs`

## Quick Reference for Common Changes

- 🆕 Adding a feature → `feat:`
- 🐛 Fixing a bug → `fix:`
- 📝 Updating docs → `docs:`
- ♻️ Refactoring code → `refactor:`
- ✅ Adding tests → `test:`
- ⚡ Improving performance → `perf:`
- 🔧 Config/tooling changes → `chore:` or `ci:`

### Breaking Changes (Major Version Bump)

For changes that break backward compatibility (v1.0.0 → v2.0.0):
- Add `!` after type: `feat!: redesign API endpoints`
- Or include `BREAKING CHANGE:` in commit body

**Example:**
```
feat!: redesign reservation API

BREAKING CHANGE: The /api/reservations endpoint now returns
a different response format. Clients must update their code.
```

## Testing PR Titles Locally

Before opening a PR, validate your title format:

```bash
cd frontend

# Test a valid PR title
echo "feat: add new feature" | npx commitlint
# ✅ No output = success

# Test an invalid PR title  
echo "Updated stuff" | npx commitlint
# ❌ Error: subject may not be empty, type may not be empty

# Test with wrong type
echo "update: add feature" | npx commitlint
# ❌ Error: type must be one of [feat, fix, docs, ...]
```

## PR Titles and Squash Merge

> [!IMPORTANT]
> Since we use **squash merge**, the PR title becomes the final commit message in the main branch.

**Key points:**
- Make your PR title descriptive and follow Conventional Commits format
- The PR title should summarize ALL changes in the PR, not just the first commit
- Choose the type based on the PRIMARY change in the PR
- Individual commits within the PR can have any format, but the PR title matters most

## Enforcement

**Automated Validation:**
- **CI**: PR titles are validated automatically on every pull request
- **Local**: Commits are validated via commitlint with husky git hooks
- Both use the same rules defined in `frontend/commitlint.config.js`

## Release Process

Semantic release uses commit messages to determine version bumps:

| Commits in Release | Version Bump | Example |
|-------------------|--------------|---------|
| Only `fix:` | Patch | v1.0.0 → v1.0.1 |
| At least one `feat:` | Minor | v1.0.0 → v1.1.0 |
| Any `BREAKING CHANGE:` or `!` | Major | v1.0.0 → v2.0.0 |
| Only `docs:`, `chore:`, etc. | No release | No version change |

**What gets created:**
- GitHub Release with auto-generated release notes
- `CHANGELOG.md` file committed to the repository
- Git tag (e.g., `v1.2.0`)