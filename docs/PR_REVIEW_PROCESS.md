# PR 리뷰 처리 프로세스

PR 리뷰를 효율적으로 처리하고 반영하는 방법에 대한 상세 가이드입니다.

## 📋 목차

1. [개요](#개요)
2. [리뷰 확인](#리뷰-확인)
3. [코드 반영](#코드-반영)
4. [리뷰 스레드 Resolve 처리](#리뷰-스레드-resolve-처리)
5. [자동화 스크립트](#자동화-스크립트)
6. [문제 해결](#문제-해결)

## 개요

PR 리뷰 처리 프로세스는 다음 단계로 구성됩니다:

1. **리뷰 확인**: PR의 모든 리뷰 스레드 확인
2. **코드 반영**: 리뷰 내용을 코드에 반영
3. **커밋 및 푸시**: 변경사항 커밋 및 푸시
4. **스레드 Resolve**: 해결된 리뷰 스레드를 GitHub에서 resolve 처리
5. **완료 확인**: 모든 리뷰가 처리되었는지 확인

## 리뷰 확인

### 1. PR 리뷰 스레드 확인

GitHub GraphQL API를 사용하여 해결되지 않은 리뷰 스레드를 확인합니다:

```bash
gh api graphql -f query='
query {
  repository(owner: "FLYLIKEB", name: "ChaLog") {
    pullRequest(number: 19) {
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
}'
```

### 2. 리뷰 내용 분석

각 리뷰 스레드의 내용을 분석하여:
- **Critical/High**: 즉시 반영 필요
- **Medium/Minor**: 반영 권장
- **Nitpick**: 선택적 반영

## 코드 반영

### 1. 리뷰 내용 반영

리뷰 내용에 따라 코드를 수정합니다:

**예시:**
- 타입 오류 수정
- null 처리 추가
- 보안 개선
- 코드 스타일 개선

### 2. 커밋 메시지 작성

리뷰 반영 커밋은 명확하게 작성합니다:

```bash
git commit -m "fix: [리뷰 반영] 이메일 중복 체크 개선

리뷰 반영:
- createNewKakaoUser: 이메일 인증 정보 생성 전 중복 체크 추가
- addEmailAuthIfNotExists: 이메일 중복 체크 범위 확장

해결된 문제:
- 카카오 사용자 생성 시 이미 등록된 이메일로 인한 DB 제약 조건 위반 방지"
```

### 3. 푸시

변경사항을 푸시합니다:

```bash
git push
```

## 리뷰 스레드 Resolve 처리

### 1. 해결된 리뷰 스레드 확인

해결된 리뷰 스레드 ID를 확인합니다:

```bash
gh api graphql -f query='
query {
  repository(owner: "FLYLIKEB", name: "ChaLog") {
    pullRequest(number: 19) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          path
        }
      }
    }
  }
}' | jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id'
```

### 2. Resolve 처리

GitHub GraphQL API를 사용하여 리뷰 스레드를 resolve 처리합니다:

```bash
THREAD_ID="PRRT_kwDOQXZXLM5kDKrb"
gh api graphql -f query="mutation { resolveReviewThread(input: { threadId: \"$THREAD_ID\" }) { thread { id isResolved } } }"
```

### 3. 일괄 처리

여러 스레드를 한 번에 처리:

```bash
THREAD_IDS=("PRRT_kwDOQXZXLM5kDKrY" "PRRT_kwDOQXZXLM5kDKra")
for THREAD_ID in "${THREAD_IDS[@]}"; do
  gh api graphql -f query="mutation { resolveReviewThread(input: { threadId: \"$THREAD_ID\" }) { thread { id isResolved } } }"
done
```

## 자동화 스크립트

### 리뷰 스레드 확인 및 Resolve 스크립트

```bash
#!/bin/bash
# PR 번호를 인자로 받아 해결되지 않은 리뷰 스레드를 확인하고 resolve 처리

PR_NUMBER=$1
if [ -z "$PR_NUMBER" ]; then
  echo "사용법: $0 <PR_NUMBER>"
  exit 1
fi

# 해결되지 않은 리뷰 스레드 확인
UNRESOLVED=$(gh api graphql -f query="
query {
  repository(owner: \"FLYLIKEB\", name: \"ChaLog\") {
    pullRequest(number: $PR_NUMBER) {
      reviewThreads(first: 100) {
        nodes {
          id
          isResolved
          path
          line
        }
      }
    }
  }
}" | jq -r '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id')

if [ -z "$UNRESOLVED" ]; then
  echo "✅ 해결되지 않은 리뷰 스레드가 없습니다."
  exit 0
fi

echo "해결되지 않은 리뷰 스레드:"
echo "$UNRESOLVED"
echo ""
read -p "이 스레드들을 resolve 처리하시겠습니까? (y/N): " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "$UNRESOLVED" | while read THREAD_ID; do
    echo "Resolving: $THREAD_ID"
    gh api graphql -f query="mutation { resolveReviewThread(input: { threadId: \"$THREAD_ID\" }) { thread { id isResolved } } }"
  done
  echo "✅ 모든 리뷰 스레드가 resolve 처리되었습니다."
fi
```

## 문제 해결

### GraphQL API 오류

**오류**: `Variable $prNumber of type Int! was provided invalid value`

**해결**: PR 번호를 정수로 전달해야 합니다. 쿼리에서 직접 숫자로 지정:

```bash
# ❌ 잘못된 방법
gh api graphql -f query='...' -f prNumber=19

# ✅ 올바른 방법
gh api graphql -f query='
query {
  repository(owner: "FLYLIKEB", name: "ChaLog") {
    pullRequest(number: 19) {
      ...
    }
  }
}'
```

### 리뷰 스레드를 찾을 수 없음

**원인**: 
- 리뷰 스레드가 이미 resolved됨
- PR 번호가 잘못됨
- 권한 문제

**해결**:
1. PR 페이지에서 직접 확인
2. PR 번호 확인: `gh pr list`
3. GitHub 인증 확인: `gh auth status`

### Resolve 처리 실패

**오류**: `Not Found` 또는 `Unauthorized`

**해결**:
1. GitHub 인증 확인: `gh auth refresh`
2. 스레드 ID가 올바른지 확인
3. PR에 대한 권한 확인

## 워크플로우 예시

### 전체 프로세스

```bash
# 1. PR 리뷰 확인
gh pr view 19

# 2. 리뷰 내용 분석 및 코드 수정
# ... 코드 수정 ...

# 3. 커밋 및 푸시
git add .
git commit -m "fix: [리뷰 반영] 이메일 중복 체크 개선"
git push

# 4. 해결된 리뷰 스레드 확인
gh api graphql -f query='...' | jq '...'

# 5. 리뷰 스레드 resolve 처리
THREAD_ID="PRRT_kwDOQXZXLM5kDKrb"
gh api graphql -f query="mutation { resolveReviewThread(input: { threadId: \"$THREAD_ID\" }) { thread { id isResolved } } }"

# 6. 완료 확인
gh pr view 19
```

## 모범 사례

### 1. 리뷰 반영 순서

1. **Critical/High 우선**: 보안 및 버그 관련 리뷰 먼저 처리
2. **타입별 그룹화**: 관련된 리뷰를 함께 처리하여 커밋 단위 최적화
3. **테스트 포함**: 리뷰 반영 시 관련 테스트도 함께 수정

### 2. 커밋 메시지

- 리뷰 반영임을 명시: `fix: [리뷰 반영] ...`
- 반영한 리뷰 내용 요약
- 해결된 문제 설명

### 3. Resolve 처리 시점

- 코드 반영 및 푸시 완료 후
- 모든 관련 리뷰가 반영된 후 일괄 처리
- 각 리뷰마다 개별적으로 처리하지 않고 그룹화하여 처리

## 관련 문서

- [`.cursor/rules`](../.cursor/rules) - Cursor AI 워크플로우 규칙
- [`docs/git-strategy.md`](./git-strategy.md) - Git 브랜치 전략
- [`docs/CODE_STYLE.md`](./CODE_STYLE.md) - 코드 스타일 가이드

