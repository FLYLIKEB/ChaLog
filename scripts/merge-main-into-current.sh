#!/bin/bash
# 원격 main 브랜치의 변경사항을 현재 브랜치에 머지
set -e

cd "$(dirname "$0")/.."

CURRENT_BRANCH=$(git branch --show-current)
if [ -z "$CURRENT_BRANCH" ]; then
  echo "❌ detached HEAD 상태입니다. 브랜치를 먼저 체크아웃하세요."
  exit 1
fi

echo "📌 현재 브랜치: $CURRENT_BRANCH"
echo ""
echo "📥 원격 origin에서 최신 정보 가져오는 중..."
git fetch origin

echo ""
echo "🔀 origin/main을 현재 브랜치에 머지하는 중..."
git merge origin/main

echo ""
echo "✅ 완료. 현재 브랜치: $CURRENT_BRANCH"
