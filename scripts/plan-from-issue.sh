#!/bin/bash

set -e
set -u

# 사용법: ./scripts/plan-from-issue.sh [옵션] <이슈번호>
# 예시: ./scripts/plan-from-issue.sh 42       # docs/plans/issue-42.plan.md 생성 (기본)
#       ./scripts/plan-from-issue.sh --print 42  # 프롬프트 본문만 출력
#       ./scripts/plan-from-issue.sh --run 42    # Cursor CLI로 Plan 즉시 실행
#
# GitHub 이슈를 기반으로 docs/plans/issue-{번호}.plan.md 파일을 생성합니다.

PRINT_PROMPT=0
RUN_CLI=0
ISSUE_NUMBER=

for arg in "$@"; do
  case "$arg" in
    --print) PRINT_PROMPT=1 ;;
    --run)   RUN_CLI=1; PRINT_PROMPT=1 ;;
    -h|--help)
      echo "Usage: $0 [--print|--run] <이슈번호>"
      echo "  (기본) docs/plans/issue-{번호}.plan.md 생성"
      echo "  --print  프롬프트 본문만 출력 (디버깅/수동 사용)"
      echo "  --run    Cursor CLI(agent)로 Plan 즉시 실행"
      exit 0
      ;;
    *)
      if [ -z "$ISSUE_NUMBER" ] && [[ "$arg" =~ ^[0-9]+$ ]]; then
        ISSUE_NUMBER="$arg"
      fi
      ;;
  esac
done

if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ Usage: $0 [--print|--run] <이슈번호>"
  echo "   예시: $0 42"
  exit 1
fi

# GitHub CLI 확인
if ! command -v gh &> /dev/null; then
  echo "❌ GitHub CLI (gh)가 설치되어 있지 않습니다."
  echo "   설치: brew install gh"
  exit 1
fi

# GitHub 인증 확인
if ! gh auth status &> /dev/null; then
  echo "❌ GitHub 인증이 필요합니다."
  echo "   실행: gh auth login"
  exit 1
fi

# Git 저장소 루트 확인
if ! git rev-parse --show-toplevel &> /dev/null; then
  echo "❌ Git 저장소 루트에서 실행해주세요."
  exit 1
fi

# 현재 브랜치 확인 (main/master 시 안내)
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || true)
if [ -n "$CURRENT_BRANCH" ] && { [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; }; then
  echo "💡 현재 main/master 브랜치입니다. Plan 확인 후 'git checkout -b feature/issue-<번호>-<기능명>' 으로 브랜치를 생성하세요."
fi

# 이슈 내용 가져오기
echo "📋 Fetching GitHub issue #$ISSUE_NUMBER..."
if ! ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json title,body,number,labels,url,state 2>/dev/null); then
  echo "❌ GitHub 이슈 조회에 실패했습니다. gh 인증/저장소 컨텍스트/이슈 번호를 확인해주세요."
  exit 1
fi
if [ -z "$ISSUE_JSON" ]; then
  echo "❌ 이슈 #$ISSUE_NUMBER 응답이 비어 있습니다."
  exit 1
fi

# 이슈 상태 확인 (closed 시 경고)
ISSUE_STATE=$(echo "$ISSUE_JSON" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('state',''))")
if [ "$(echo "$ISSUE_STATE" | tr '[:upper:]' '[:lower:]')" = "closed" ]; then
  echo "⚠️  이슈 #$ISSUE_NUMBER 는 이미 닫혀 있습니다. 진행할까요? (계속하려면 그대로 실행됩니다)"
fi

# Python으로 프롬프트 구성
OUTPUT=$(echo "$ISSUE_JSON" | python3 -c "
import json
import sys

def build_prompt(body):
    return f'''다음 GitHub 이슈를 기반으로 개발 계획(plan)을 작성해주세요.

---

## 이슈 정보
- 번호: #{num}
- 제목: {title}
- 라벨: {label_names}
- URL: {url}

## 이슈 본문

{body}

---

## 조건
- .cursor/rules/github-issue-workflow.mdc 규칙을 따르세요.
- 브랜치 명명: feature/issue-{num}-{{기능명-kebab-case}}
- 테스트 계획을 포함하세요 (프론트엔드 빌드: npm run build, 프론트엔드 테스트: npm run test:run, 백엔드 빌드: cd backend && npm run build, 백엔드 테스트: cd backend && npm run test, E2E: cd backend && npm run test:e2e)
- 테스트 후 커밋 전, 변경사항에 대한 셀프 코드리뷰를 진행하세요. .cursor/rules/ 의 rule 파일들을 참조해 코드리뷰를 진행하세요.
- 구현 전 단계별 계획만 제시하고, 코드 작성은 하지 마세요.

## 필수: 구체적인 Todo
반드시 TodoWrite 형식의 구체적인 todo 목록을 포함하세요. 각 todo는 실행 가능한 단위 작업으로, 파일/경로·기능을 명시하고 5~10개 이상 구체적으로 나열하세요.
**todo 순서: 구현 → 테스트 → 셀프 코드리뷰(.cursor/rules/ 참조) → 커밋 → PR → main 브랜치로 이동**
'''

data = json.load(sys.stdin)
num = data.get('number', '')
title = data.get('title', '')
body = data.get('body') or ''
url = data.get('url', '')
labels = data.get('labels') or []
label_names = ', '.join(l.get('name', '') for l in labels) if labels else '(없음)'

max_body = 3500
if len(body) > max_body:
    body = body[:max_body] + f'\n\n[... 이슈 본문이 {len(body)}자로 잘렸습니다. 전체: {url}]'

print(build_prompt(body))
")

# --print: 프롬프트만 출력 후 종료
if [ "$PRINT_PROMPT" -eq 1 ] && [ "$RUN_CLI" -eq 0 ]; then
  echo "$OUTPUT"
  exit 0
fi

# --run: Cursor CLI로 Plan 즉시 실행
if [ "$RUN_CLI" -eq 1 ]; then
  if ! command -v agent &> /dev/null; then
    echo "❌ Cursor CLI (agent)가 설치되어 있지 않습니다."
    echo "   설치: curl https://cursor.com/install -fsS | bash"
    echo "   또는 plan 파일 생성: $0 $ISSUE_NUMBER"
    exit 1
  fi
  echo "🚀 Cursor CLI로 이슈 #$ISSUE_NUMBER Plan 실행 중..."
  agent --plan "$OUTPUT"
  exit 0
fi

# 기본: docs/plans/issue-{번호}.plan.md 생성
REPO_ROOT=$(git rev-parse --show-toplevel)
PLANS_DIR="$REPO_ROOT/docs/plans"
PLAN_FILE="$PLANS_DIR/issue-${ISSUE_NUMBER}.plan.md"
mkdir -p "$PLANS_DIR"
echo "$OUTPUT" > "$PLAN_FILE"
echo "✅ 생성됨: $PLAN_FILE"
echo "💡 Cursor Agent 탭에서 Plan 모드(Shift+Tab)로 해당 파일 내용을 붙여넣어 실행하세요."
