Semantic Release with Conventional Commits
Implement automated semantic versioning based on commit messages, with automatic changelog generation and GitHub releases. Since the project uses squash merge strategy, PR title validation is the primary enforcement mechanism.

User Review Required
IMPORTANT

Breaking Change Detection: With semantic-release, a feat!: or BREAKING CHANGE: in a PR title will trigger a major version bump (e.g., v1.0.0 → v2.0.0). Ensure this behavior is understood.

WARNING

Changelog Location: By default, CHANGELOG.md will be generated and committed to the repo. If you prefer changelog only in GitHub Releases, I can configure that instead.

Proposed Changes
CI: PR Title Validation
Enforce Conventional Commits format on PR titles (squash merge strategy means PR title becomes commit message).

[MODIFY] 
pull-request.yml
Add a new job at the beginning:

validate-pr-title:
  name: Validate PR Title
  runs-on: ubuntu-latest
  timeout-minutes: 1
  steps:
    - uses: amannn/action-semantic-pull-request@v5
      env:
        GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      with:
        types: |
          feat
          fix
          docs
          style
          refactor
          perf
          test
          build
          ci
          chore
          revert
        requireScope: false
        subjectPattern: ^.+$
        subjectPatternError: 'The subject must not be empty'
Update all other jobs to depend on this:

needs: [validate-pr-title, lint-frontend]  # example
Local: Commitlint + Husky
Add local commit message validation (optional but recommended for local DX).

[MODIFY] 
package.json
Add devDependencies:

"@commitlint/cli": "^19.0.0",
"@commitlint/config-conventional": "^19.0.0"
[NEW] 
commitlint.config.js
export default { extends: ['@commitlint/config-conventional'] };
[NEW] 
commit-msg
npx --no -- commitlint --edit "$1"
CI: Semantic Release
Replace manual versioning with semantic-release.

[MODIFY] 
package.json
Add devDependencies:

"semantic-release": "^24.0.0",
"@semantic-release/changelog": "^6.0.3",
"@semantic-release/git": "^10.0.1"
Add script:

"release": "semantic-release"
[NEW] 
.releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    ["@semantic-release/changelog", {
      "changelogFile": "CHANGELOG.md"
    }],
    ["@semantic-release/npm", {
      "npmPublish": false
    }],
    ["@semantic-release/git", {
      "assets": ["CHANGELOG.md", "frontend/package.json"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    "@semantic-release/github"
  ]
}
[MODIFY] 
release.yml
Replace the "Determine Next Version" and "Create Release Tag" steps with:

- name: Semantic Release
  working-directory: ./frontend
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: npx semantic-release
Remove steps:

"Determine Next Version"
"Create Release Tag"
"Create GitHub Release"
Documentation
[MODIFY] 
README.md
Add new section after "Git Hooks" (around line 261):

### Conventional Commits
This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification for commit messages and PR titles.
**Format**: `<type>(<scope>): <description>`
| Type | Version Bump | Example |
|------|--------------|---------|
| `fix:` | Patch (v1.0.0 → v1.0.1) | `fix: resolve login redirect` |
| `feat:` | Minor (v1.0.0 → v1.1.0) | `feat: add calendar view` |
| `feat!:` or `BREAKING CHANGE:` | Major (v1.0.0 → v2.0.0) | `feat!: redesign API` |
| `docs:`, `style:`, `refactor:`, `test:`, `chore:` | No release | `docs: update README` |
> [!NOTE]
> Since we use **squash merge**, the PR title becomes the commit message. Ensure PRs follow this format.
**Enforcement**:
- **CI**: PR titles are validated automatically
- **Local**: Commits are validated via commitlint (optional)
Verification Plan
Automated Tests
PR Title Validation (CI):

# Create a test PR with invalid title (e.g., "Updated stuff")
# Expected: CI fails with "validate-pr-title" job error
# Create a test PR with valid title (e.g., "feat: add new feature")
# Expected: CI passes validation
Local Commitlint:

cd frontend
npm install
echo "invalid commit message" | npx commitlint
# Expected: Error - subject may not be empty
echo "feat: valid message" | npx commitlint
# Expected: Success
Manual Verification
After merging a fix: PR: Check that patch version increments
After merging a feat: PR: Check that minor version increments
Verify CHANGELOG.md: Contains release notes grouped by type


Semantic Release Implementation
Tasks
[/] Create implementation plan

 Review existing project setup (package.json, workflows, README)
 Write implementation plan with all changes
 Get user approval
 Add PR Title Validation

 Add action-semantic-pull-request to 
pull-request.yml
 Add commitlint for Local Enforcement

 Install @commitlint/cli and @commitlint/config-conventional
 Create commitlint.config.js
 Add commit-msg hook in .husky/
 Implement Semantic Release in 
release.yml

 Install semantic-release and plugins
 Create .releaserc.json configuration
 Update 
release.yml
 to use semantic-release
 Remove manual version determination logic
 Update Documentation

 Update 
README.md
 with Conventional Commits section
 Document PR title format requirements