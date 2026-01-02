---
title: "[Security] Fix NPM Security Vulnerabilities in Frontend"
labels: security, frontend, high-priority
assignees: ''
---

## Description
The frontend has 12 npm security vulnerabilities (8 moderate, 4 high) detected during `npm ci` in both local and Docker builds.

## Acceptance Criteria
- [ ] All high-severity vulnerabilities fixed
- [ ] All moderate-severity vulnerabilities fixed or documented as acceptable
- [ ] `npm audit` returns 0 vulnerabilities (or only known exceptions)
- [ ] Build pipeline runs clean without vulnerability warnings

## Technical Details
- **Target**: `frontend/package.json`, `frontend/package-lock.json`

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

1. Run `npm audit` in the `frontend/` directory to identify the vulnerable packages
2. Attempt automatic fix with `npm audit fix`
3. If issues persist, review breaking changes and run `npm audit fix --force`
4. For packages that cannot be updated, evaluate alternatives or document accepted risks

### ✅ Verification

- **CI Check**: Run the full pipeline and verify no vulnerability warnings appear
- **Functionality**: Ensure all frontend tests pass after dependency updates
