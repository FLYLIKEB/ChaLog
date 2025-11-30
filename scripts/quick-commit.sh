#!/bin/bash

set -e  # 첫 번째 에러에서 즉시 종료
set -u  # 정의되지 않은 변수 사용 시 에러

# 사용법: ./scripts/quick-commit.sh [브랜치명] [커밋메시지]
# 예시: ./scripts/quick-commit.sh feature/new-feature "feat: 새로운 기능 추가"

BRANCH_NAME=${1:-$(git branch --show-current)}
COMMIT_MSG=${2:-"chore: update"}

CURRENT_BRANCH=$(git branch --show-current)

# 변경사항 확인
if git diff --quiet && git diff --cached --quiet; then
  echo "⚠️  No changes to commit."
  exit 0
fi

# 브랜치가 main이면 신규 브랜치 생성
if [ "$CURRENT_BRANCH" = "main" ] && [ "$BRANCH_NAME" != "main" ]; then
  echo "📦 Creating new branch: $BRANCH_NAME"
  if ! git checkout -b "$BRANCH_NAME" 2>/dev/null; then
    echo "⚠️  Branch already exists. Switching to existing branch."
    git checkout "$BRANCH_NAME"
  fi
fi

echo "📝 Staging changes..."
# 변경사항 미리보기
echo "📋 Changes to be committed:"
git diff --name-only --cached
read -p "Continue with commit? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "❌ Aborted."
  exit 1
fi

git add .

echo "💾 Committing: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

echo "🚀 Pushing to origin/$BRANCH_NAME..."
git push -u origin "$BRANCH_NAME"

echo "✅ Done! Committed and pushed to $BRANCH_NAME"
