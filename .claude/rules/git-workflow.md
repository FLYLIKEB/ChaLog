# Git & PR Workflow

## 이슈 기반 신규 기능 개발 순서
1. `git checkout main && git pull && git checkout -b feature/issue-{번호}-{설명}`
2. 구현
3. `npm run build && npm run test:run` + `cd backend && npm run build && npm run test`
4. `git commit -m "feat: #번호 설명"`
5. `git pull --rebase origin feature/issue-{번호}-{설명}` → push
6. `gh pr create` — 본문에 `Closes #번호` 필수

## 브랜치 규칙
- **모든 신규 작업 시작 브랜치는 반드시 main** — 예외 없음
  ```bash
  git checkout main && git pull origin main && git checkout -b feature/issue-{번호}-{설명}
  ```
- **기존 브랜치 작업 중**: 브랜치 전환 없이 현재 브랜치 유지
- main/master 직접 커밋 금지

## 커밋 메시지
```
feat: #123 기능명        # 새 기능
fix: #123 버그 설명      # 버그 수정
refactor: 리팩터링 설명  # 기능 변경 없는 코드 개선
```

## PR 생성
```bash
gh pr create --title "feat: #번호 기능명" --body "$(cat <<'EOF'
## Summary
- Closes #번호
- 변경 내용

## Test plan
- [ ] npm run build
- [ ] npm run test:run
- [ ] cd backend && npm run build && npm run test
EOF
)"
```

## PR 머지
- 반드시 `gh pr merge --merge --delete-branch` (squash 금지)

## Push 전
```bash
git pull --rebase origin <브랜치명>
```

## DB 스키마 변경 시
- `*.entity.ts` 수정 → Migration 파일 반드시 함께 커밋
- Migration은 TypeORM CLI로만 생성 (수동 SQL 금지)
- 참조: `.claude/rules/database.md`
