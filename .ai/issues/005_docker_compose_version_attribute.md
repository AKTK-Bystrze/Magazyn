---
title: "[Chore] Remove Obsolete Docker Compose Version Attribute"
labels: chore, infrastructure
assignees: ''
---

## Description
The `version` attribute in `infra/docker-compose.yml` is obsolete and generates warnings in CI logs. Docker Compose V2 ignores this attribute.

## Acceptance Criteria
- [ ] `version` attribute removed from `infra/docker-compose.yml`
- [ ] Docker Compose runs without obsolete attribute warning
- [ ] All services start correctly after the change

## Technical Details
- **Target**: `infra/docker-compose.yml`

---

## 👨‍💻 Developer Guide

### 📚 Relevant Documentation
- **[Project Structure](../../documentation/project_structure.md)**
- **[Global Rules](../../.agent/rules/good-practises.md)**

### **Locate the files**:
- `infra/docker-compose.yml`

### 📝 Implementation Steps

1. Open `infra/docker-compose.yml`
2. Remove the `version: '3.8'` line at the top of the file
3. Ensure the `services:` block starts at the top level

### ✅ Verification

- **Local Check**: Run `docker compose up -d` and verify no "version is obsolete" warning
- **Functionality**: All containers start and become healthy
