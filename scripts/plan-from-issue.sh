#!/bin/bash

set -e
set -u

# 사용법: ./scripts/plan-from-issue.sh <이슈번호>
# 예시: ./scripts/plan-from-issue.sh 42
#
# GitHub 이슈를 기반으로 Cursor Agent Plan 모드에서 개발 계획을 생성합니다.

ISSUE_NUMBER=${1:-}
if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ Usage: $0 <이슈번호>"
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

# Cursor Agent CLI 확인
if ! command -v agent &> /dev/null; then
  echo "❌ Cursor Agent CLI가 설치되어 있지 않습니다."
  echo "   설치: curl https://cursor.com/install -fsSL | bash"
  exit 1
fi

# jq 확인
if ! command -v jq &> /dev/null; then
  echo "❌ jq가 설치되어 있지 않습니다."
  echo "   설치: brew install jq"
  exit 1
fi

# 이슈 내용 가져오기
echo "📋 Fetching GitHub issue #$ISSUE_NUMBER..."
ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json title,body,number,labels,url 2>/dev/null) || true
if [ -z "$ISSUE_JSON" ]; then
  echo "❌ 이슈 #$ISSUE_NUMBER을 찾을 수 없습니다."
  exit 1
fi

ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.title')
ISSUE_BODY=$(echo "$ISSUE_JSON" | jq -r '.body // ""')
ISSUE_URL=$(echo "$ISSUE_JSON" | jq -r '.url')

# 에이전트에 전달할 프롬프트 구성
PROMPT="다음 GitHub 이슈를 기반으로 개발 계획(plan)을 작성해주세요.

## 이슈 정보
- 번호: #$ISSUE_NUMBER
- 제목: $ISSUE_TITLE
- URL: $ISSUE_URL

## 이슈 본문
$ISSUE_BODY

## 조건
- .cursor/rules/github-issue-workflow.mdc 규칙을 따르세요.
- 브랜치 명명: feature/issue-$ISSUE_NUMBER-{기능명-kebab-case}
- 테스트 계획을 포함하세요 (프론트엔드: npm run test:run, 백엔드: cd backend && npm run test, E2E: cd backend && npm run test:e2e)
- 구현 전 단계별 계획만 제시하고, 코드 작성은 하지 마세요.
"

# Plan 모드로 에이전트 실행
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
echo "🤖 Cursor Agent (Plan 모드) 실행 중..."
agent --mode plan --print --trust --workspace "$REPO_ROOT" "$PROMPT"
