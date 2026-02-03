---
title: "[CI] Add Missing Environment Variables to Cleanup Step"
labels: ci, infrastructure
assignees: ''
---

## Description
The CI cleanup step is missing `PUBLIC_BACKEND_URL` and `PUBLIC_APP_URL` environment variables, generating warnings during `docker compose down`.

## Acceptance Criteria
- [ ] Missing environment variables added to cleanup step with defaults
- [ ] No "variable is not set" warnings during cleanup phase
- [ ] CI logs are cleaner

## Technical Details
- **Target**: `.github/workflows/release.yml` (or relevant workflow file)
- **Variables**: `PUBLIC_BACKEND_URL`, `PUBLIC_APP_URL`

---

## 👨‍💻 Developer Guide

### 📚 Relevant Documentation
- **[Project Structure](../../documentation/project_structure.md)**
- **[Global Rules](../../.agent/rules/good-practises.md)**

### **Locate the files**:
- `.github/workflows/release.yml`
- `.github/workflows/pull-request.yml`

### 📝 Implementation Steps

1. Locate the cleanup step in the workflow file(s)
2. Add environment variables with default values:
   ```yaml
   env:
     PUBLIC_BACKEND_URL: ${PUBLIC_BACKEND_URL:-http://localhost:8080}
     PUBLIC_APP_URL: ${PUBLIC_APP_URL:-http://localhost:4321}
   ```
3. Apply to all cleanup steps in relevant workflow files

### ✅ Verification

- **CI Check**: Run the workflow and verify no variable warnings in cleanup phase
- **Functionality**: Cleanup completes successfully
