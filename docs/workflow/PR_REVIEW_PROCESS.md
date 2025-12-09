# PR 리뷰 처리 프로세스

PR 리뷰를 자동으로 처리하는 간소화된 프로세스 가이드입니다.

## 개요

PR 링크 또는 PR 번호만 제공하면, 모든 리뷰를 자동으로 확인하고 반영한 후, 커밋을 한번에 푸시하고 리뷰 스레드를 자동으로 resolve 처리합니다.

## 사용 방법

### 기본 사용법

PR 링크 또는 PR 번호를 제공하면 자동으로 처리됩니다:

```
PR 링크: https://github.com/FLYLIKEB/ChaLog/pull/19
또는
PR 번호: 19
```

### 처리 프로세스

1. **PR 정보 파싱**: 링크에서 PR 번호 추출 또는 직접 사용
2. **리뷰 스레드 확인**: 해결되지 않은 모든 코드래빗 리뷰 스레드 조회
3. **코드 반영**: AI 도구를 사용하여 리뷰 내용을 코드에 반영
4. **자동 커밋**: 파일 변경 감지 시 자동으로 커밋 및 푸시
5. **답글 작성**: 리뷰 스레드의 첫 번째 코멘트에 직접 답글 작성 (REST API 사용)
6. **Resolve 처리**: 해결된 리뷰 스레드를 자동으로 resolve

## 자동화 워크플로우

### 1. PR 번호 추출

```bash
# PR 링크에서 번호 추출
PR_URL="https://github.com/FLYLIKEB/ChaLog/pull/19"
PR_NUMBER=$(echo $PR_URL | grep -oP '/pull/\K\d+')
# 또는 직접 제공
PR_NUMBER=19
```

### 2. 리뷰 스레드 확인

```bash
gh api graphql -f query="
query {
  repository(owner: \"FLYLIKEB\", name: \"ChaLog\") {
    pullRequest(number: $PR_NUMBER) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          path
          line
          comments(first: 3) {
            nodes {
              bodyText
            }
          }
        }
      }
    }
  }
}"
```

### 3. 코드 반영 및 커밋

리뷰 내용에 따라 코드를 수정하고 커밋합니다:

```bash
# 코드 수정 후
git add .
git commit -m "fix: [PR #$PR_NUMBER 리뷰 반영] 리뷰 내용 요약"
```

### 4. 일괄 푸시

모든 커밋을 한번에 푸시:

```bash
git push
```

### 5. 리뷰 스레드에 답글 작성 및 Resolve

```bash
# 리뷰 코멘트에 답글 작성 (REST API)
gh api "repos/{owner}/{repo}/pulls/{pull_number}/comments/{comment_id}/replies" \
  -X POST \
  -f body="✅ 리뷰 반영 완료"

# 리뷰 스레드 resolve (GraphQL API)
gh api graphql -f query="mutation {
  resolveReviewThread(input: { threadId: \"$THREAD_ID\" }) {
    thread {
      id
      isResolved
    }
  }
}"
```

참고: 스크립트는 리뷰 스레드의 첫 번째 코멘트 ID를 사용하여 직접 답글을 작성합니다.

## 자동화 스크립트

### 통합 스크립트 예시

```bash
#!/bin/bash
# process-pr-reviews.sh

PR_URL_OR_NUMBER=$1
if [ -z "$PR_URL_OR_NUMBER" ]; then
  echo "Usage: $0 <PR_URL_OR_NUMBER>"
  exit 1
fi

# PR 번호 추출
if [[ $PR_URL_OR_NUMBER =~ ^https:// ]]; then
  PR_NUMBER=$(echo $PR_URL_OR_NUMBER | grep -oP '/pull/\K\d+')
else
  PR_NUMBER=$PR_URL_OR_NUMBER
fi

echo "Processing PR #$PR_NUMBER..."

# 1. 리뷰 스레드 확인
echo "Fetching review threads..."
# ... 리뷰 스레드 확인 로직 ...

# 2. 코드 반영
echo "Applying review feedback..."
# ... 코드 수정 로직 ...

# 3. 커밋 및 푸시
echo "Committing and pushing changes..."
git add .
git commit -m "fix: [PR #$PR_NUMBER 리뷰 반영] 자동 리뷰 반영"
git push

# 4. 리뷰 스레드 resolve
echo "Resolving review threads..."
# ... resolve 처리 로직 ...

echo "✅ PR 리뷰 처리 완료"
```

## 리뷰 유형별 처리

### Critical/High 우선순위

보안 및 버그 관련 리뷰는 즉시 반영:

- 타입 오류
- null 처리 누락
- 보안 취약점
- 데이터 정합성 문제

### Medium/Minor 우선순위

코드 품질 개선 관련 리뷰:

- 코드 스타일 개선
- 성능 최적화
- 중복 코드 제거
- 문서화 개선

### Nitpick

선택적 반영:

- 변수명 개선
- 주석 추가
- 포맷팅 개선

## 커밋 메시지 형식

리뷰 반영 커밋은 다음 형식을 따릅니다:

```
fix: [PR #<번호> 리뷰 반영] <주요 변경사항>

리뷰 반영:
- <리뷰 항목 1>
- <리뷰 항목 2>

해결된 문제:
- <문제 1>
- <문제 2>
```

## 문제 해결

### PR 번호 추출 실패

**원인**: 잘못된 URL 형식

**해결**: PR 번호를 직접 제공하거나 올바른 GitHub PR URL 사용

### 리뷰 스레드를 찾을 수 없음

**원인**: 
- 모든 리뷰가 이미 resolved됨
- PR 번호가 잘못됨

**해결**: PR 페이지에서 직접 확인

### Resolve 처리 실패

**원인**: 권한 문제 또는 잘못된 스레드 ID

**해결**: 
- GitHub 인증 확인: `gh auth status`
- 스레드 ID 재확인

## 모범 사례

1. **일괄 처리**: 모든 리뷰를 반영한 후 한번에 커밋 및 푸시
2. **명확한 커밋 메시지**: 반영한 리뷰 내용을 명확히 기록
3. **자동화 활용**: 스크립트를 사용하여 반복 작업 자동화
4. **검증**: 푸시 전에 변경사항 확인

## 관련 문서

- [`.cursor/rules`](../.cursor/rules) - Cursor AI 워크플로우 규칙
- Git 브랜치 전략: `.cursor/rules/workflow/git.md` 참고
- PR 워크플로우: `.cursor/rules/workflow/pr.md` 참고
- 코드 스타일 가이드: `.cursor/rules/development/code-style.md` 참고
