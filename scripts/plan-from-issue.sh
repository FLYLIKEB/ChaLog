#!/bin/bash

set -e
set -u

# 사용법: ./scripts/plan-from-issue.sh <이슈번호>
# 예시: ./scripts/plan-from-issue.sh 42
#
# GitHub 이슈를 기반으로 Cursor Agent 탭에 Plan 프롬프트를 열어줍니다 (Deep Link 방식).

ISSUE_NUMBER=${1:-}
if [ -z "$ISSUE_NUMBER" ]; then
  echo "❌ Usage: $0 <이슈번호>"
  echo "   예시: $0 42"
  exit 1
fi
if ! [[ "$ISSUE_NUMBER" =~ ^[0-9]+$ ]]; then
  echo "❌ 이슈 번호는 숫자만 입력해주세요."
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

# jq 확인
if ! command -v jq &> /dev/null; then
  echo "❌ jq가 설치되어 있지 않습니다."
  echo "   설치: brew install jq"
  exit 1
fi

# Git 저장소 루트 확인
if ! git rev-parse --show-toplevel &> /dev/null; then
  echo "❌ Git 저장소 루트에서 실행해주세요."
  exit 1
fi

# 이슈 내용 가져오기
echo "📋 Fetching GitHub issue #$ISSUE_NUMBER..."
if ! ISSUE_JSON=$(gh issue view "$ISSUE_NUMBER" --json title,body,number,labels,url 2>/dev/null); then
  echo "❌ GitHub 이슈 조회에 실패했습니다. gh 인증/저장소 컨텍스트/이슈 번호를 확인해주세요."
  exit 1
fi
if [ -z "$ISSUE_JSON" ]; then
  echo "❌ 이슈 #$ISSUE_NUMBER 응답이 비어 있습니다."
  exit 1
fi

# Python으로 프롬프트 구성 및 URL 인코딩 (특수문자 안전 처리)
DEEPLINK_URL=$(echo "$ISSUE_JSON" | python3 -c "
import json
import sys
import urllib.parse

data = json.load(sys.stdin)
num = data.get('number', '')
title = data.get('title', '')
body = data.get('body') or ''
url = data.get('url', '')

# Deep Link URL 최대 8000자
max_body = 3500
if len(body) > max_body:
    body = body[:max_body] + f'\n\n[... 이슈 본문이 {len(body)}자로 잘렸습니다. 전체: {url}]'

prompt = f'''다음 GitHub 이슈를 기반으로 개발 계획(plan)을 작성해주세요.

## 이슈 정보
- 번호: #{num}
- 제목: {title}
- URL: {url}

## 이슈 본문
{body}

## 조건
- .cursor/rules/github-issue-workflow.mdc 규칙을 따르세요.
- 브랜치 명명: feature/issue-{num}-{{기능명-kebab-case}}
- 테스트 계획을 포함하세요 (프론트엔드: npm run test:run, 백엔드: cd backend && npm run test, E2E: cd backend && npm run test:e2e)
- 구현 전 단계별 계획만 제시하고, 코드 작성은 하지 마세요.
'''

encoded = urllib.parse.quote(prompt, safe='')
deeplink = f'cursor://anysphere.cursor-deeplink/prompt?text={encoded}'
if len(deeplink) > 8000:
    body = body[:2000] + f'\n\n[... 이슈 본문이 잘렸습니다. 전체: {url}]'
    prompt = f'''다음 GitHub 이슈를 기반으로 개발 계획(plan)을 작성해주세요.

## 이슈 정보
- 번호: #{num}
- 제목: {title}
- URL: {url}

## 이슈 본문
{body}

## 조건
- .cursor/rules/github-issue-workflow.mdc 규칙을 따르세요.
- 브랜치 명명: feature/issue-{num}-{{기능명-kebab-case}}
- 테스트 계획을 포함하세요.
- 구현 전 단계별 계획만 제시하고, 코드 작성은 하지 마세요.
'''
    encoded = urllib.parse.quote(prompt, safe='')
    deeplink = f'cursor://anysphere.cursor-deeplink/prompt?text={encoded}'

print(deeplink)
")

# Cursor Deep Link 열기
echo "🔗 Cursor Agent 탭에 이슈 #$ISSUE_NUMBER Plan 프롬프트 열기..."
if [[ "$(uname)" == "Darwin" ]]; then
  open "$DEEPLINK_URL"
elif [[ "$(uname)" == "Linux" ]]; then
  if ! xdg-open "$DEEPLINK_URL" 2>/dev/null; then
    echo "❌ Cursor Deep Link를 열지 못했습니다."
    echo "   아래 URL을 브라우저에 복사해 열어보세요:"
    echo "   https://cursor.com/link/prompt${DEEPLINK_URL#*prompt}"
    exit 1
  fi
else
  echo "❌ 이 OS에서는 open/xdg-open을 지원하지 않습니다."
  echo "   아래 URL을 브라우저에 복사해 열어보세요:"
  echo "   https://cursor.com/link/prompt${DEEPLINK_URL#*prompt}"
  exit 1
fi

echo "✅ Cursor가 열리면 Agent 탭에서 Plan 모드(Shift+Tab)로 실행하세요."
