## PR Review Process

- Input: PR URL or PR number
- Process: Automatically fetch all review threads, apply fixes, commit changes, push to remote, and resolve all review threads
- Output: All review feedback implemented and review threads resolved

### CodeRabbit 리뷰 자동 처리

코드래빗 리뷰를 자동으로 처리하려면 다음 스크립트를 사용하세요:

```bash
./scripts/apply-coderabbit-reviews.sh <PR_URL_OR_NUMBER>
```

예시:
```bash
./scripts/apply-coderabbit-reviews.sh 19
./scripts/apply-coderabbit-reviews.sh https://github.com/FLYLIKEB/ChaLog/pull/19
```

이 스크립트는:
1. PR 번호를 추출합니다
2. 코드래빗 봇의 해결되지 않은 리뷰 스레드를 모두 가져옵니다
3. 각 리뷰에 대해 반복:
   - 리뷰 내용을 표시합니다
   - 코드 수정을 기다립니다 (수동 또는 AI 도구 사용)
   - 변경사항을 커밋합니다
   - 리뷰에 반영 내용을 댓글로 작성합니다
   - 리뷰 스레드를 resolve합니다
4. 모든 리뷰가 처리될 때까지 반복합니다

**사용 방법:**
- PR 번호나 링크를 제공하면 스크립트가 자동으로 처리합니다
- 각 리뷰마다 코드를 수정한 후 Enter를 누르면 커밋, 댓글 작성, resolve가 자동으로 수행됩니다
- AI 도구를 사용하여 "이 리뷰 반영해줘"라고 요청하면 코드를 자동으로 수정할 수 있습니다

### 일반 PR 리뷰 처리

Workflow:
1. Parse PR number from URL or use provided number
2. Fetch all unresolved review threads using GitHub GraphQL API
3. Analyze and apply review feedback to code
4. Commit all changes with review reference
5. Push all commits to remote in one batch
6. Automatically resolve all review threads via GitHub API

Detailed Guide: docs/workflow/PR_REVIEW_PROCESS.md

## PR Creation

- Check branch is `feature/*` and pushed to remote
- Generate title from branch name, description from commits
- Link related issues in PR description:
  - Use `Closes #123` or `Fixes #123` to auto-close issues when PR is merged
  - Use `Related to #123` for related but not directly closing issues
- Use `gh pr create` if available, otherwise provide GitHub URL

