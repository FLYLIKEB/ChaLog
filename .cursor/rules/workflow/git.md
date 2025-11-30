## Git Operations

- Commit messages: Korean format `<type>: <description>` (e.g., `feat: 노트 필터 기능 추가`)
  - When fixing issues: Include issue number in commit message (e.g., `fix: #123 버그 수정`)
  - When implementing features: Reference issue number (e.g., `feat: #45 노트 필터 기능 추가`)
- Pre-commit: Run `npm run lint` (if exists), `tsc --noEmit`, `npm run test:run` (if exists)
  - If validation fails: Show errors, don't commit, suggest fixes
- Branch naming: Use `feature/*` pattern based on changed files
  - For issue-based work: `feature/issue-123` or `feature/123-description`
- Documentation: Auto-update README.md, docs/architecture/Architecture.md when code changes
  - Triggers: New features, API changes, component changes, route/page changes, dependency changes
- Task tracking: Use GitHub Issues instead of markdown files for tasks, features, and improvements
  - Link issues in PRs: Use `Closes #123` or `Fixes #123` in PR description to auto-close issues
  - Reference issues in commits: Use `#123` format to link commits to issues
  - Do not create temporary markdown files for issue preparation - create issues directly
  - If temporary markdown files are created, delete them immediately after creating the issue

