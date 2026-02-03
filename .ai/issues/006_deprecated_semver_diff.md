---
title: "[Chore] Remove Deprecated semver-diff Package"
labels: chore, frontend, dependencies
assignees: ''
---

## Description
The `semver-diff@5.0.0` package is deprecated as the `semver` package now supports this functionality built-in. This generates deprecation warnings during `npm ci`.

## Acceptance Criteria
- [ ] Determine if `semver-diff` is a direct or transitive dependency
- [ ] Replace usage with built-in `semver` functionality OR update parent package
- [ ] No deprecation warnings for `semver-diff` during `npm ci`

## Technical Details
- **Target**: `frontend/package.json`
- **Package**: `semver-diff@5.0.0`

---

## 👨‍💻 Developer Guide

### 📚 Relevant Documentation
- **[Project Structure](../../documentation/project_structure.md)**
- **[Frontend Coding Standards](../../frontend/docs/coding_standards.md)**
- **[Global Rules](../../.agent/rules/good-practises.md)**

### **Locate the files**:
- `frontend/package.json`
- `frontend/package-lock.json`

### 📝 Implementation Steps

1. Check if `semver-diff` is a direct dependency in `frontend/package.json`
2. If direct: remove it and refactor code to use `semver` package's built-in comparison
3. If transitive: identify the parent package using `npm ls semver-diff` and update it
4. Run `npm ci` and verify no deprecation warnings

### ✅ Verification

- **CLI Check**: `npm ci` runs without `semver-diff` deprecation warning
- **Functionality**: Any functionality relying on version comparison still works
