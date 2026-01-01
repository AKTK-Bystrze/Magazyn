---
description: How to write commit messages following Conventional Commits
globs:
  alwaysApply: true
---

# Writing Commit Messages & PR Titles

## Format
All commit messages and PR titles MUST follow Conventional Commits format:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

## Type Selection Guide

**Choose the type based on the PRIMARY change:**

### `feat:` - New Features
Use when adding new functionality or capabilities
- Adding a new page or component
- Implementing a new API endpoint
- Adding a user-facing feature
- Enhancing existing functionality

**Examples:**
- `feat: add calendar view for reservations`
- `feat(auth): implement two-factor authentication`
- `feat(ui): add dark mode toggle`

### `fix:` - Bug Fixes
Use when correcting errors or unexpected behavior
- Fixing a crash or error
- Correcting incorrect calculations
- Resolving UI display issues
- Patching security vulnerabilities

**Examples:**
- `fix: resolve login redirect loop`
- `fix(backend): correct credit deduction calculation`
- `fix(e2e): stabilize flaky reservation test`

### `docs:` - Documentation
Use when ONLY changing documentation (no code changes)
- README updates
- Adding code comments
- API documentation
- Setup guides

**Examples:**
- `docs: update installation instructions`
- `docs(api): add endpoint documentation for reservations`

### `refactor:` - Code Refactoring
Use when restructuring code without changing behavior
- Extracting functions or classes
- Renaming variables for clarity
- Reorganizing file structure
- Simplifying complex code

**Examples:**
- `refactor: extract reservation logic to service layer`
- `refactor(ui): simplify component hierarchy`

### `test:` - Tests
Use when adding or modifying tests only
- Adding unit tests
- Adding E2E tests
- Updating test configurations

**Examples:**
- `test: add unit tests for credit service`
- `test(e2e): add admin reservation flow tests`

### `perf:` - Performance
Use when improving performance without changing behavior
- Optimizing database queries
- Reducing bundle size
- Improving render performance
- Caching optimizations

**Examples:**
- `perf: optimize equipment availability queries`
- `perf(frontend): lazy load reservation calendar`

### `chore:` - Maintenance
Use for maintenance tasks that don't modify src or test files
- Updating dependencies
- Cleaning up old files
- Updating .gitignore
- General housekeeping

**Examples:**
- `chore: update dependencies to latest versions`
- `chore: clean up obsolete migration files`

### `ci:` - CI/CD Changes
Use when changing CI/CD workflows or configurations
- Updating GitHub Actions
- Modifying deployment scripts
- Changing build configurations

**Examples:**
- `ci: add PR title validation workflow`
- `ci: optimize Docker layer caching`

### `style:` - Code Style
Use for formatting changes that don't affect code meaning
- Running prettier/linter
- Fixing indentation
- Removing whitespace

**Examples:**
- `style: format code with prettier`
- `style: fix ESLint warnings`

### `build:` - Build System
Use when changing build tools or dependencies
- Updating webpack/vite config
- Changing build scripts
- Modifying package.json scripts

**Examples:**
- `build: migrate to Vite 5`
- `build: add TypeScript path aliases`

## Breaking Changes

For changes that break backward compatibility, use either:
1. Add `!` after type: `feat!: redesign API endpoints`
2. Add `BREAKING CHANGE:` footer in commit body

**Example:**
```
feat!: redesign reservation API

BREAKING CHANGE: The /api/reservations endpoint now returns
a different response format. Clients must update their code.
```

## Scope (Optional)

Use scope to specify what part of the codebase is affected:
- `feat(auth): add OAuth support`
- `fix(backend): correct credit calculation`
- `docs(setup): update Docker instructions`
- `test(e2e): add reservation flow`

Common scopes:
- `auth`, `ui`, `backend`, `frontend`, `api`, `db`, `e2e`, `ci`, `docs`

## Testing PR Titles Locally

Before opening a PR, validate your title:

```bash
cd frontend

# Test valid title
echo "feat: add new feature" | npx commitlint

# Test invalid title
echo "Updated stuff" | npx commitlint
```

## Quick Decision Tree

1. **Did you add a user-facing feature?** → `feat:`
2. **Did you fix a bug?** → `fix:`
3. **Did you only change documentation?** → `docs:`
4. **Did you restructure code without changing behavior?** → `refactor:`
5. **Did you add/update tests?** → `test:`
6. **Did you improve performance?** → `perf:`
7. **Did you update CI/CD?** → `ci:`
8. **Did you do maintenance/chores?** → `chore:`
9. **Did you only change code style/formatting?** → `style:`
10. **Did you change build configuration?** → `build:`

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

## PR Title = Squash Commit Message

Since we use **squash merge**, the PR title becomes the final commit message.
Make your PR title descriptive and follow this format!

**The PR title should summarize ALL changes in the PR, not just the first commit.**

## Enforcement

- **CI validates PR titles** automatically on every pull request
- **Commitlint validates local commits** via husky git hooks
- Both use the same rules defined in `frontend/commitlint.config.js`
