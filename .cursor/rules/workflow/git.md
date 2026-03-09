## 이슈 기반 신규 기능 개발 워크플로우

Plan 모드로 이슈의 신규 기능을 구현할 때 반드시 아래 순서를 따른다:

1. **Plan 생성**: GitHub 이슈 기반으로 Cursor Agent Plan 생성
   ```bash
   ./scripts/plan-from-issue.sh <이슈번호>
   ```
   - Plan 검토 및 합의 후 구현 시작
2. **신규 브랜치 생성**: `feature/issue-{번호}-{설명}` 형식으로 브랜치 생성 후 체크아웃
   ```bash
   git checkout -b feature/issue-123-add-filter
   ```
3. **구현 작업**: Plan에서 합의된 내용대로 코드 작성
4. **검증**: `npm run build && npm run test:run` (프론트엔드), `cd backend && npm run build && npm run test` (백엔드) → 통과 확인
5. **커밋**: 이슈 번호 포함 커밋 메시지로 커밋
   ```bash
   git commit -m "feat: #123 필터 기능 구현"
   ```
6. **Push 및 PR 생성**: 원격 브랜치 push 후 PR 생성 (`Closes #123` 포함)
   ```bash
   git push -u origin feature/issue-123-add-filter
   gh pr create --title "feat: #123 필터 기능 구현" --body "$(cat <<'EOF'
   ## Summary
   - Closes #123
   - <변경 내용 bullet points>

   ## Test plan
   - [ ] npm run build
   - [ ] npm run test:run
   - [ ] cd backend && npm run build
   - [ ] cd backend && npm run test
   EOF
   )"
   ```
7. **머지**: PR 승인 후 머지 (직접 머지 또는 GitHub UI 사용)

> 신규 기능은 반드시 `main`/`master`에 직접 커밋하지 말고, 위 워크플로우를 통해 PR로만 반영한다.

---

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

1. Plan 생성: `./scripts/plan-from-issue.sh <이슈번호>` (Cursor Agent Plan 모드)
2. 신규 브랜치 생성: `git checkout -b feature/issue-{번호}-{설명}`
3. 기능 구현 (plan 확인 후 실행)
4. 빌드/린트/타입체크 통과 확인: `npm run build`, `tsc --noEmit`, `npm run test:run`, `cd backend && npm run build`, `cd backend && npm run test`
5. 커밋 후 원격 브랜치 push: `git push -u origin HEAD`
6. `gh pr create`로 PR 생성 — 반드시 `Closes #{번호}` 포함

## DB Migration Commits

- When committing entity file changes (`*.entity.ts`), always include Migration files (`migrations/*.ts`)
- Commit format: `feat: Add location column to notes` (include both entity and migration files)
- Never commit entity changes without corresponding Migration files
- Migration files must be in `backend/migrations/` directory
- Test Migration on test DB before committing: `TEST_DATABASE_URL=... npm run migration:run`

