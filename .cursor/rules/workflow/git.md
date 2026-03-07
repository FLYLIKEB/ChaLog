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

## 신규 기능 브랜치 워크플로우

이슈 기반 신규 기능 구현 시 반드시 다음 순서를 따른다:

1. 신규 브랜치 생성: `git checkout -b feature/issue-{번호}-{설명}`
2. 기능 구현 (plan 확인 후 실행)
3. 빌드/린트/타입체크 통과 확인: `npm run build`, `tsc --noEmit`
4. 커밋 후 원격 브랜치 push: `git push -u origin HEAD`
5. `gh pr create`로 PR 생성 — 반드시 `Closes #{번호}` 포함

## DB Migration Commits

- When committing entity file changes (`*.entity.ts`), always include Migration files (`migrations/*.ts`)
- Commit format: `feat: Add location column to notes` (include both entity and migration files)
- Never commit entity changes without corresponding Migration files
- Migration files must be in `backend/migrations/` directory
- Test Migration on test DB before committing: `TEST_DATABASE_URL=... npm run migration:run`

