# Issue Creation Prompt

This prompt is for an agent to generate a standardized issue description for the Magazyn project.

## 1. Pre-computation / Validation
**CRITICAL**: Before writing the issue content, you MUST perform these checks:
1.  **Validity Check**: verifying if the issue is still valid and reproducible. Check the code.
2.  **Research**: Read the `documentation/`, `backend/docs/`, and `frontend/docs/` directories to find relevant context.

## 2. Issue Format
The output must be a markdown file following this exact structure:

```markdown
---
title: [Type] Short Precise Title
labels: type, tech-stack (e.g., refactor, frontend)
assignees: ''
---

## Description
A concise and precise summary of the problem or goal. Avoid fluff.

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Technical Details
- **Target**: `path/to/target/file`
- **Replacement**: `path/to/replacement` (if applicable)
- **Removal**: `path/to/removed` (if applicable)

---

## 👨‍💻 Developer Guide (Good First Issue)

### 📚 Relevant Documentation
*[MANDATORY]* Include links to:
- **[Project Structure](../../documentation/project_structure.md)**
- **[Frontend Coding Standards](../../frontend/docs/coding_standards.md)** and **[Backend Coding Standards](../../backend/docs/coding_standards.md)**
- **[Global Rules](../../.agent/rules/good-practises.md)**
- **[Backend Rules](../../backend/docs/rules)** and **[Frontend Rules](../../frontend/docs/rules)**
- Any other specific docs relevant to the task.

### 📝 Implementation Steps
1.  Provide abstract, high-level solution steps.
2.  Describe the logical flow of changes (e.g., "Update component props", "Add validtion logic") rather than exact line edits.

### ✅ Verification
- **Visual Check**: What should it look like?
- **Functionality**: What specific behavior to test?
```

## 3. Style Guidelines
- **Concise**: Be direct. No filler words.
- **Precise**: Use exact file paths and component names.
- **Helpful**: The Developer Guide should enable a junior dev to start immediately without asking questions.
