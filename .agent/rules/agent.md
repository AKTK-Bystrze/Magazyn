---
trigger: always_on
---

---

description: Global instructions for Antigravity agent
globs:
alwaysApply: true

---

# Antigravity Agent Context

## Interaction & Communication

- **Clarification**: Ask questions for clarification when needed.
- **Explanations**: Use Mermaid diagrams when explaining concepts.
- **Brevity**: Keep answers and questions short and use bullet points.

## Workflow & Approval

- **Planning**: Always create a plan before making changes and ask for approval.
- **Code Diagrams**: Create diagrams of the code to be written and wait for approval before writing the code.
- **Doc/Config Changes**: Ask for approval before changing documentation or configuration files.

## Code Quality & Maintenance

- **Formatting Consistency**: Do NOT make back-and-forth formatting changes (such as collapsing or spreading lines differently than the existing code). Use targeted code replacements.
- **Enforce Prettier**: After creating or modifying any frontend files (including `.astro`), you MUST run the project's formatting tools (e.g., `npm run lint:fix` or `npx prettier --write <file>`) to ensure the changes conform to the established Prettier standard before committing or finishing the task.
- **Linting**: Always run linters when making code changes.
- **Documentation**: Check if code changes require documentation updates and reflect them accordingly.
